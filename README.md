# 🏪 罗德岛补给站 · 明日方舟主题电商网站

> 暗色科幻风格全栈电商平台，灵感源自《明日方舟》罗德岛制药公司。

---

## 🚀 快速启动

```bash
# 1. 安装依赖（仅首次）
npm install

# 2. 启动服务器
npm run dev          # 直接启动后端（端口 3000）
npm start            # 通过控制台启动（端口 3000 + 3001）
```

或双击 `【启动服务器】双击运行.bat` 一键启动。

| 地址 | 说明 |
|------|------|
| `http://localhost:3000/Hypergryphmode.html` | 主网站 |
| `http://localhost:3001` | 服务器控制台 |

---

## ✨ 功能总览

### 核心电商
- 🛒 **商品浏览** — 分类筛选 / 关键词搜索 / 排序切换
- 👤 **用户系统** — 注册登录，密码 SHA256 加密
- 🛍️ **购物车** — 增删改查，实时总价计算
- ❤️ **心愿单** — 收藏/取消，一键加入购物车
- 📦 **订单管理** — 下单、历史查询
- 🎫 **优惠券** — 领券中心，下单自动抵扣

### 视觉交互
- ✨ **粒子特效** — Canvas 鼠标交互粒子网格，磁吸排斥 + 回弹动画
- 🕰️ **品牌故事** — 交错垂直时间线，展示发展里程碑
- ⭐ **干员评价墙** — 6 位干员评价卡片，星级评分 + 商品标签
- 📊 **数据看板** — 带数字滚动动画的 4 列统计栏
- 🎠 **轮播图** — Hero 区域自动轮播，支持手动/键盘切换
- 👀 **滚动动画** — IntersectionObserver 驱动的渐显上浮效果

### 性能优化
- 🖼️ **图片懒加载** — 模糊→清晰渐入过渡，预加载
- 💀 **骨架屏** — Shimmer 闪烁占位，匹配真实卡片布局
- 📱 **响应式** — 适配桌面/平板/手机

### 容灾降级
- 🔄 后端不可达时自动切换 localStorage 本地模式
- 🌐 开发/生产环境自动识别 API 地址

---

## 📁 项目结构

```
bishe4/
├── Hypergryphmode.html          ← 主网站（单文件全栈，~6270 行）
├── server.js                    ← 后端 API 服务器（Express, 端口 3000）
├── launcher.js                  ← 进程管理器（端口 3001）
├── package.json                 ← 依赖：express, cors
│
├── data/                        ← JSON 数据持久化
│   ├── products.json            ← 商品数据
│   ├── users.json               ← 用户（SHA256 加密）
│   ├── orders.json              ← 订单记录
│   ├── carts.json               ← 购物车
│   └── wishlists.json           ← 心愿单
│
├── 【启动服务器】双击运行.bat
├── 【关闭服务器】双击运行.bat
└── node_modules/
```

---

## 🔧 后端 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/products` | 商品列表（`?category=` `?q=` `?sort=`） |
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET/POST/PUT | `/api/cart/:userId` | 购物车 CRUD |
| GET/POST | `/api/wishlist/:userId/toggle` | 心愿单切换 |
| POST | `/api/orders` | 创建订单 |
| GET | `/api/orders/:userId` | 订单查询 |
| POST | `/api/coupon/validate` | 优惠券验证 |

---

## 🛠️ 技术栈

| 层 | 技术 |
|----|------|
| 前端 | HTML5 / CSS3 / Vanilla JS (ES6+) |
| 后端 | Node.js + Express 5 |
| 数据 | JSON 文件持久化 |
| 特效 | Canvas 2D / IntersectionObserver / requestAnimationFrame |

---

## 📋 环境要求

- Node.js 18+
- 无需数据库，数据存本地 JSON 文件
