package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

// 消息类型
type Message struct {
	Type             string `json:"type"`
	KeyHash          string `json:"keyHash,omitempty"`
	EncryptedMessage string `json:"encryptedMessage,omitempty"`
	Message          string `json:"message,omitempty"`
}

// 客户端连接
type Client struct {
	Conn    *websocket.Conn
	KeyHash string
	Send    chan []byte
}

// 连接管理器
type Hub struct {
	clients    map[*Client]bool
	keyClients map[string][]*Client // keyHash -> clients
	register   chan *Client
	unregister chan *Client
	broadcast  chan Message
	mutex      sync.RWMutex
}

// 创建新的Hub
func newHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		keyClients: make(map[string][]*Client),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan Message),
	}
}

// 运行Hub
func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			if client.KeyHash != "" {
				h.keyClients[client.KeyHash] = append(h.keyClients[client.KeyHash], client)
			}
			h.mutex.Unlock()
			log.Printf("客户端已连接，KeyHash: %s", client.KeyHash)

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)

				// 从keyClients中移除
				if client.KeyHash != "" {
					clients := h.keyClients[client.KeyHash]
					for i, c := range clients {
						if c == client {
							h.keyClients[client.KeyHash] = append(clients[:i], clients[i+1:]...)
							break
						}
					}
					// 如果没有客户端了，删除这个keyHash
					if len(h.keyClients[client.KeyHash]) == 0 {
						delete(h.keyClients, client.KeyHash)
					}
				}
			}
			h.mutex.Unlock()
			log.Printf("客户端已断开连接，KeyHash: %s", client.KeyHash)

		case message := <-h.broadcast:
			h.mutex.RLock()
			if message.Type == "message" && message.KeyHash != "" {
				// 转发给相同keyHash的所有客户端
				if clients, exists := h.keyClients[message.KeyHash]; exists {
					for _, client := range clients {
						select {
						case client.Send <- []byte(fmt.Sprintf(`{"type":"message","encryptedMessage":"%s"}`, message.EncryptedMessage)):
						default:
							close(client.Send)
							delete(h.clients, client)
						}
					}
				}
			}
			h.mutex.RUnlock()
		}
	}
}

// 客户端读写循环
func (c *Client) readPump(hub *Hub) {
	defer func() {
		hub.unregister <- c
		c.Conn.Close()
	}()

	for {
		_, messageBytes, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket错误: %v", err)
			}
			break
		}

		var message Message
		if err := json.Unmarshal(messageBytes, &message); err != nil {
			log.Printf("解析消息失败: %v", err)
			continue
		}

		switch message.Type {
		case "register":
			c.KeyHash = message.KeyHash
			// 重新注册到正确的keyHash组
			hub.mutex.Lock()
			hub.keyClients[message.KeyHash] = append(hub.keyClients[message.KeyHash], c)
			hub.mutex.Unlock()
			log.Printf("客户端注册成功，KeyHash: %s", message.KeyHash)

		case "message":
			// 广播消息给相同keyHash的客户端
			hub.broadcast <- message
		}
	}
}

func (c *Client) writePump() {
	defer c.Conn.Close()

	for {
		select {
		case message, ok := <-c.Send:
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("发送消息失败: %v", err)
				return
			}
		}
	}
}

// WebSocket升级器
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // 允许所有来源
	},
}

// WebSocket处理函数
func handleWebSocket(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket升级失败: %v", err)
		return
	}

	client := &Client{
		Conn: conn,
		Send: make(chan []byte, 256),
	}

	hub.register <- client

	go client.writePump()
	go client.readPump(hub)
}

// 静态文件服务
func serveStaticFiles() http.Handler {
	return http.FileServer(http.Dir("./static/"))
}

func main() {
	hub := newHub()
	go hub.run()

	// 静态文件路由 - 图片切分工具
	http.HandleFunc("/pic/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/pic/" {
			http.ServeFile(w, r, "../split_pic_web/index.html")
		} else {
			http.StripPrefix("/pic/", http.FileServer(http.Dir("../split_pic_web/"))).ServeHTTP(w, r)
		}
	})

	// 静态文件路由 - 跨端加密复制工具
	http.HandleFunc("/copy/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/copy/" {
			http.ServeFile(w, r, "../copy_web/index.html")
		} else {
			http.StripPrefix("/copy/", http.FileServer(http.Dir("../copy_web/"))).ServeHTTP(w, r)
		}
	})

	// 处理根路径访问
	http.HandleFunc("/pic", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/pic/", http.StatusMovedPermanently)
	})
	http.HandleFunc("/copy", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/copy/", http.StatusMovedPermanently)
	})

	// WebSocket路由
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handleWebSocket(hub, w, r)
	})

	// 静态资源路由
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("../"))))

	// 根路径显示主页面
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// 如果是静态资源请求，直接返回文件
		if r.URL.Path == "/style.css" || r.URL.Path == "/script.js" {
			http.ServeFile(w, r, ".."+r.URL.Path)
			return
		}
		// 否则返回主页面
		http.ServeFile(w, r, "../index.html")
	})

	// 健康检查
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// 测试页面
	http.HandleFunc("/test", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "../test_routes.html")
	})

	port := ":8080"
	log.Printf("服务器启动在端口 %s", port)
	log.Printf("图片切分工具: http://localhost%s/pic/", port)
	log.Printf("安全文本传输: http://localhost%s/copy/", port)

	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatal("服务器启动失败:", err)
	}
}
