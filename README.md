# 罗德岛补给站 · 明日方舟主题电商网站

## 快速启动

| 操作 | 方式 |
|------|------|
| **启动服务** | 双击 `【启动服务器】双击运行.bat` |
| **关闭服务** | 双击 `【关闭服务器】双击运行.bat`，或直接关闭黑色命令行窗口 |
| **打开网站** | 启动后浏览器会自动打开控制台，点击「打开网站」即可 |

> 首次运行会自动安装依赖（`npm install`），需要联网，约 30 秒。

---

## 访问地址

| 地址 | 说明 |
|------|------|
| `http://localhost:3000/Hypergryphmode.html` | 主网站 |
| `http://localhost:3001` | 服务器控制台（启动/关闭/状态） |

---

## 项目结构

```
bishe4/
├── 【启动服务器】双击运行.bat   ← 一键启动（推荐入口）
├── 【关闭服务器】双击运行.bat   ← 一键关闭
│
├── Hypergryphmode.html          ← 主网站前端（明日方舟电商页面）
├── launcher.js                  ← 进程管理器（端口 3001，托管控制台）
├── server.js                    ← 主后端 API 服务器（端口 3000）
│
├── data/
│   ├── products.json            ← 商品数据（16件）
│   ├── users.json               ← 用户数据（密码 SHA256 加密）
│   ├── orders.json              ← 订单记录
│   ├── carts.json               ← 购物车数据
│   └── wishlists.json           ← 心愿单数据
│
├── package.json
└── node_modules/                ← 依赖（自动生成，勿手动修改）
```

---

## 架构说明

```
双击 BAT
  └─► launcher.js（端口 3001）
          ├─ 提供浏览器控制台页面
          ├─ 自动 fork 启动 server.js（端口 3000）
          └─ 控制台可随时点击 启动 / 关闭 主服务器
```

- **前端**：纯 HTML/CSS/JS，调用后端 API；后端不可达时自动降级为 localStorage 本地模式
- **后端**：Node.js + Express，数据持久化到 `data/` 目录的 JSON 文件

---

## 后端 API 一览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/products` | 获取商品（支持 `?category=` `?q=` `?sort=`） |
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| GET/POST/PUT | `/api/cart/:userId` | 购物车 |
| GET/POST | `/api/wishlist/:userId/toggle` | 心愿单 |
| POST | `/api/orders` | 创建订单 |
| GET | `/api/orders/:userId` | 查询订单 |
| POST | `/api/coupon/validate` | 验证优惠券 |

---

## 环境要求

- Node.js 18+（[下载地址](https://nodejs.org/)）
- 无需安装数据库，数据存储在本地 JSON 文件中
