package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

// Config 配置结构
type Config struct {
	Server struct {
		Port string `json:"port"`
		Host string `json:"host"`
	} `json:"server"`
	WebSocket struct {
		Path            string `json:"path"`
		MaxConnections  int    `json:"maxConnections"`
		ReadBufferSize  int    `json:"readBufferSize"`
		WriteBufferSize int    `json:"writeBufferSize"`
	} `json:"websocket"`
	CORS struct {
		AllowedOrigins []string `json:"allowedOrigins"`
		AllowedMethods []string `json:"allowedMethods"`
		AllowedHeaders []string `json:"allowedHeaders"`
	} `json:"cors"`
	Logging struct {
		Level         string `json:"level"`
		EnableConsole bool   `json:"enableConsole"`
		EnableFile    bool   `json:"enableFile"`
	} `json:"logging"`
}

// Client 客户端连接信息
type Client struct {
	Conn     *websocket.Conn
	KeyHash  string
	Send     chan []byte
	LastSeen time.Time
}

// Hub 管理所有客户端连接
type Hub struct {
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte
	mutex      sync.RWMutex
}

// Message WebSocket消息结构
type Message struct {
	Type             string `json:"type"`
	KeyHash          string `json:"keyHash,omitempty"`
	EncryptedMessage string `json:"encryptedMessage,omitempty"`
	EncryptedContent string `json:"encryptedContent,omitempty"`
	ContentType      string `json:"contentType,omitempty"`
	Success          bool   `json:"success,omitempty"`
	Message          string `json:"message,omitempty"`
}

var (
	config Config
	hub    *Hub
)

func init() {
	// 加载配置文件
	loadConfig()

	// 初始化Hub
	hub = &Hub{
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan []byte),
	}
}

func main() {
	// 启动Hub
	go hub.run()

	// 设置路由
	r := mux.NewRouter()

	// CORS中间件
	r.Use(corsMiddleware)

	// WebSocket路由
	r.HandleFunc(config.WebSocket.Path, handleWebSocket)

	// 健康检查路由
	r.HandleFunc("/health", healthCheck).Methods("GET")

	// 静态文件服务（用于前端）
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("../frontend/")))

	// 启动服务器
	addr := fmt.Sprintf("%s:%s", config.Server.Host, config.Server.Port)
	log.Printf("服务器启动在 %s", addr)
	log.Printf("WebSocket路径: %s", config.WebSocket.Path)

	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatal("服务器启动失败:", err)
	}
}

// loadConfig 加载配置文件
func loadConfig() {
	configFile := "config.json"
	if _, err := os.Stat(configFile); os.IsNotExist(err) {
		log.Fatal("配置文件不存在:", configFile)
	}

	data, err := ioutil.ReadFile(configFile)
	if err != nil {
		log.Fatal("读取配置文件失败:", err)
	}

	if err := json.Unmarshal(data, &config); err != nil {
		log.Fatal("解析配置文件失败:", err)
	}

	log.Printf("配置文件加载成功")
}

// corsMiddleware CORS中间件
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 设置CORS头
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// 处理预检请求
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// healthCheck 健康检查
func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	response := map[string]interface{}{
		"status":    "ok",
		"timestamp": time.Now().Unix(),
		"clients":   len(hub.clients),
	}
	json.NewEncoder(w).Encode(response)
}

// handleWebSocket 处理WebSocket连接
func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{
		ReadBufferSize:  config.WebSocket.ReadBufferSize,
		WriteBufferSize: config.WebSocket.WriteBufferSize,
		CheckOrigin: func(r *http.Request) bool {
			return true // 允许所有来源
		},
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket升级失败: %v", err)
		return
	}

	client := &Client{
		Conn:     conn,
		Send:     make(chan []byte, 256),
		LastSeen: time.Now(),
	}

	hub.register <- client

	// 启动goroutine处理客户端
	go client.writePump()
	go client.readPump()
}

// run Hub主循环
func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			h.mutex.Unlock()
			log.Printf("客户端连接，当前连接数: %d", len(h.clients))

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
			}
			h.mutex.Unlock()
			log.Printf("客户端断开，当前连接数: %d", len(h.clients))

		case message := <-h.broadcast:
			h.mutex.RLock()
			for client := range h.clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.clients, client)
				}
			}
			h.mutex.RUnlock()
		}
	}
}

// readPump 读取客户端消息
func (c *Client) readPump() {
	defer func() {
		hub.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(int64(config.WebSocket.ReadBufferSize))
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, messageBytes, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket错误: %v", err)
			}
			break
		}

		c.LastSeen = time.Now()

		// 解析消息
		var msg Message
		if err := json.Unmarshal(messageBytes, &msg); err != nil {
			log.Printf("解析消息失败: %v", err)
			continue
		}

		// 处理消息
		c.handleMessage(msg)
	}
}

// writePump 向客户端发送消息
func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// 批量发送消息
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleMessage 处理客户端消息
func (c *Client) handleMessage(msg Message) {
	switch msg.Type {
	case "register":
		// 客户端注册
		if msg.KeyHash == "" {
			c.sendError("密钥哈希不能为空")
			return
		}

		c.KeyHash = msg.KeyHash
		log.Printf("客户端注册成功，密钥哈希: %s", msg.KeyHash)

		// 发送注册成功响应
		response := Message{
			Type:    "register_success",
			Message: "注册成功",
		}
		c.sendMessage(response)

	case "message":
		// 转发消息给相同密钥的其他客户端
		if c.KeyHash == "" {
			c.sendError("请先注册")
			return
		}

		if msg.KeyHash != c.KeyHash {
			c.sendError("密钥不匹配")
			return
		}

		// 广播给相同密钥的其他客户端
		response := Message{
			Type:             "message",
			EncryptedMessage: msg.EncryptedMessage,
		}
		c.broadcastToSameKey(response)

		log.Printf("转发消息，密钥哈希: %s", c.KeyHash)

	case "copy":
		// 处理复制请求
		if c.KeyHash == "" {
			c.sendError("请先注册")
			return
		}

		if msg.KeyHash != c.KeyHash {
			c.sendError("密钥不匹配")
			return
		}

		// 广播复制请求给相同密钥的其他客户端
		response := Message{
			Type:             "copy",
			EncryptedContent: msg.EncryptedContent,
			ContentType:      msg.ContentType,
		}
		c.broadcastToSameKey(response)

		// 发送复制响应
		copyResponse := Message{
			Type:    "copy_response",
			Success: true,
			Message: "复制请求已发送",
		}
		c.sendMessage(copyResponse)

		log.Printf("处理复制请求，密钥哈希: %s, 内容类型: %s", c.KeyHash, msg.ContentType)

	default:
		c.sendError("未知消息类型")
	}
}

// sendMessage 发送消息给客户端
func (c *Client) sendMessage(msg Message) {
	messageBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("序列化消息失败: %v", err)
		return
	}

	select {
	case c.Send <- messageBytes:
	default:
		close(c.Send)
		hub.unregister <- c
	}
}

// sendError 发送错误消息
func (c *Client) sendError(message string) {
	errorMsg := Message{
		Type:    "error",
		Message: message,
	}
	c.sendMessage(errorMsg)
}

// broadcastToSameKey 广播消息给相同密钥的客户端
func (c *Client) broadcastToSameKey(msg Message) {
	messageBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("序列化消息失败: %v", err)
		return
	}

	hub.mutex.RLock()
	defer hub.mutex.RUnlock()

	for client := range hub.clients {
		if client != c && client.KeyHash == c.KeyHash {
			select {
			case client.Send <- messageBytes:
			default:
				close(client.Send)
				delete(hub.clients, client)
			}
		}
	}
}

// generateKeyHash 生成密钥哈希
// func generateKeyHash(key string) string {
// 	hash := md5.Sum([]byte(key))
// 	return fmt.Sprintf("%x", hash)
// }
