    // ==================== 后端 API 配置 ====================
    // 自动检测环境：本地开发用 localhost，部署到 GitHub Pages 用相对路径（触发降级模式）
    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3000/api'
        : '/api';

    // 构建认证请求头（兼容 x-user-id 和 JWT Bearer）
    function getAuthHeaders() {
        const headers = {};
        if (currentUser) {
            headers['x-user-id'] = currentUser.id;
            const token = localStorage.getItem('rhodesToken');
            if (token) headers['Authorization'] = 'Bearer ' + token;
        }
        return headers;
    }

    // API 请求封装
    async function apiGet(path) {
        const res = await fetch(API_BASE + path, { headers: getAuthHeaders() });
        return res.json();
    }

    async function apiPost(path, body) {
        const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
        const res = await fetch(API_BASE + path, {
            method: 'POST', headers, body: JSON.stringify(body)
        });
        return res.json();
    }

    async function apiPut(path, body) {
        const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
        const res = await fetch(API_BASE + path, {
            method: 'PUT', headers, body: JSON.stringify(body)
        });
        return res.json();
    }

    async function apiDelete(path) {
        const res = await fetch(API_BASE + path, {
            method: 'DELETE', headers: getAuthHeaders()
        });
        return res.json();
    }

    // ==================== 安全工具 ====================
    // HTML 转义，防止 XSS
    function escapeHtml(str) {
        if (!str && str !== 0) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // 前端密码哈希（SHA-256），避免明文传输密码
    async function hashPasswordClient(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'rhodes_salt');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ==================== 输入验证 ====================
    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validatePassword(password) {
        // 至少6位，允许字母数字和常见特殊字符
        return password.length >= 6 && password.length <= 128 && /^[\x20-\x7E]+$/.test(password);
    }

    function validateName(name) {
        // 2-20位，中英文、数字、下划线
        return name.length >= 2 && name.length <= 20 && /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/.test(name);
    }

    function sanitizeInput(str) {
        if (!str) return '';
        return str.trim().replace(/[<>]/g, '');
    }

    // ==================== 商品数据（从后端加载）====================
    let products = [];

    async function loadProducts() {
        try {
            const res = await apiGet('/products');
            if (res.code === 0) {
                products = res.data;
                // 映射后端分类到前端 category_key 字段
                products.forEach(p => {
                    p.category_key = mapCategory(p.category);
                });
            }
        } catch(e) {
            // 后端不可达，降级使用内置数据（GitHub Pages 静态托管场景）
            products = FALLBACK_PRODUCTS.map(p => {
                const product = { 
                    ...p, 
                    category_key: mapCategory(p.category)
                };
                // 为每个商品生成 SVG 图片
                const categoryColors = {
                    '战术装备': '#00d4ff',
                    '限定周边': '#a855f7',
                    '罗德岛食品': '#22c55e',
                    '服装配件': '#f59e0b',
                    '源石科技': '#06ffa5'
                };
                const color = categoryColors[p.category] || '#00d4ff';
                const nameLower = p.name.toLowerCase();
                
                let svgType = 'uniform';
                if (nameLower.includes('背包')) svgType = 'backpack';
                else if (nameLower.includes('手办') || nameLower.includes('摆件')) svgType = 'figure';
                else if (nameLower.includes('玩偶') || nameLower.includes('毛绒')) svgType = 'plush';
                else if (nameLower.includes('饮料') || nameLower.includes('食品')) svgType = 'drink';
                else if (nameLower.includes('刀') || nameLower.includes('剑')) svgType = 'sword';
                else if (nameLower.includes('喷雾') || nameLower.includes('药')) svgType = 'spray';
                else if (nameLower.includes('t 恤') || nameLower.includes('衫') || nameLower.includes('T恤')) svgType = 'tshirt';
                
                product.image = createProductSVG(svgType, color);
                return product;
            });
        }
    }

    // 创建商品 SVG 图片
    function createProductSVG(type, color) {
        const svgConfig = {
            uniform: `<rect x="30" y="25" width="40" height="50" rx="4" fill="${color}" opacity="0.15" stroke="${color}" stroke-width="1.5"/><path d="M35 35 L50 25 L65 35" stroke="${color}" stroke-width="1.5" fill="none"/><circle cx="50" cy="45" r="8" fill="${color}" opacity="0.3"/>`,
            backpack: `<rect x="30" y="30" width="40" height="45" rx="6" fill="${color}" opacity="0.15" stroke="${color}" stroke-width="1.5"/><path d="M35 35 Q50 25 65 35" stroke="${color}" stroke-width="1.5" fill="none"/><rect x="38" y="45" width="24" height="20" rx="2" fill="${color}" opacity="0.2"/>`,
            figure: `<circle cx="50" cy="35" r="12" fill="${color}" opacity="0.2" stroke="${color}" stroke-width="1.5"/><rect x="38" y="50" width="24" height="35" rx="3" fill="${color}" opacity="0.15" stroke="${color}" stroke-width="1.5"/><circle cx="50" cy="35" r="6" fill="${color}" opacity="0.4"/>`,
            plush: `<circle cx="50" cy="50" r="30" fill="${color}" opacity="0.2" stroke="${color}" stroke-width="1.5"/><circle cx="40" cy="45" r="4" fill="${color}" opacity="0.5"/><circle cx="60" cy="45" r="4" fill="${color}" opacity="0.5"/><ellipse cx="50" cy="55" rx="6" ry="4" fill="${color}" opacity="0.4"/>`,
            drink: `<rect x="35" y="30" width="30" height="45" rx="4" fill="${color}" opacity="0.2" stroke="${color}" stroke-width="1.5"/><ellipse cx="50" cy="30" rx="15" ry="4" fill="${color}" opacity="0.3" stroke="${color}" stroke-width="1.5"/><rect x="40" y="40" width="20" height="25" rx="2" fill="${color}" opacity="0.15"/>`,
            sword: `<rect x="48" y="25" width="4" height="55" fill="${color}" opacity="0.3" stroke="${color}" stroke-width="1.5"/><rect x="35" y="70" width="30" height="4" rx="2" fill="${color}" stroke="${color}" stroke-width="1.5"/><circle cx="50" cy="72" r="5" fill="${color}" opacity="0.4"/>`,
            spray: `<rect x="42" y="35" width="16" height="40" rx="3" fill="${color}" opacity="0.2" stroke="${color}" stroke-width="1.5"/><rect x="46" y="25" width="8" height="12" fill="${color}" opacity="0.4"/><circle cx="50" cy="30" r="3" fill="${color}" opacity="0.6"/>`,
            tshirt: `<path d="M30 30 L40 25 L50 30 L60 25 L70 30 L65 75 L35 75 Z" fill="${color}" opacity="0.15" stroke="${color}" stroke-width="1.5"/><path d="M35 35 L45 30 L55 30 L65 35" stroke="${color}" stroke-width="1" fill="none"/>`
        };

        return `data:image/svg+xml,${encodeURIComponent(`
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" fill="rgba(0,0,0,0.3)" rx="8"/>
                ${svgConfig[type] || ''}
                <text x="50" y="92" text-anchor="middle" font-size="8" fill="${color}" opacity="0.5" font-family="Arial">RHODES</text>
            </svg>
        `)}`;
    }

    // 根据商品名称和分类创建 SVG 图片（辅助函数）
    function createProductSVGFromCategory(category, name) {
        const categoryColors = {
            '战术装备': '#00d4ff',
            '限定周边': '#a855f7',
            '罗德岛食品': '#22c55e',
            '服装配件': '#f59e0b',
            '源石科技': '#06ffa5'
        };
        const color = categoryColors[category] || '#00d4ff';
        
        // 根据名称关键词判断类型
        const nameLower = name.toLowerCase();
        if (nameLower.includes('制服') || nameLower.includes('服装')) return createProductSVG('uniform', color);
        if (nameLower.includes('背包')) return createProductSVG('backpack', color);
        if (nameLower.includes('手办') || nameLower.includes('摆件')) return createProductSVG('figure', color);
        if (nameLower.includes('玩偶') || nameLower.includes('毛绒')) return createProductSVG('plush', color);
        if (nameLower.includes('饮料') || nameLower.includes('食品')) return createProductSVG('drink', color);
        if (nameLower.includes('刀') || nameLower.includes('剑')) return createProductSVG('sword', color);
        if (nameLower.includes('喷雾') || nameLower.includes('药')) return createProductSVG('spray', color);
        if (nameLower.includes('t 恤') || nameLower.includes('衫')) return createProductSVG('tshirt', color);
        
        // 默认使用分类颜色创建简单图形
        return createProductSVG('uniform', color);
    }

    // 分类映射函数：将中文分类映射到英文标识
    function mapCategory(category) {
        const categoryMap = {
            '战术装备': 'tactical',
            '限定周边': 'digital',
            '罗德岛食品': 'food',
            '服装配件': 'clothing',
            '源石科技': 'tech'
        };
        return categoryMap[category] || 'all';
    }

    // 备用内置数据（后端未启动时使用，与 products.json 结构保持一致）
    const FALLBACK_PRODUCTS = [
        { id:1, name:'莱茵生命医疗急救包', price:299, originalPrice:399, category:'战术装备', tag:'限定', rating:4.9, reviews:2341, stock:50, desc:'莱茵生命官方授权急救包，内含源石抗体、原原体修复贴片及多种战地急救器材。', specs:['标准版','战术版','精英版'], attrs:{品牌:'莱茵生命',材质:'航空铝合金+防弹纤维',重量:'1.2kg',保质期:'3年'} },
        { id:2, name:'罗德岛战术作战背包', price:459, originalPrice:599, category:'战术装备', tag:'热销', rating:4.8, reviews:1872, stock:30, desc:'采用高强度防刺面料，多隔层设计，适合长途作战任务。源石加固背板。', specs:['30L','45L','60L'], attrs:{品牌:'罗德岛',容量:'45L',材质:'MOLLE战术尼龙',颜色:'战术黑/沙漠褐'} },
        { id:3, name:'德克萨斯限定武士刀摆件', price:888, originalPrice:1188, category:'限定周边', tag:'限定', rating:5.0, reviews:567, stock:8, desc:'德克萨斯同款武士刀1:1高精度复刻，金属刀身镌刻狼图腾纹路，附证书。', specs:['收藏版','签名版'], attrs:{材质:'高碳钢+黑檀木',全长:'105cm',重量:'1.8kg',附件:'收纳木盒+证书'} },
        { id:4, name:'阿米娅指挥官套装', price:199, originalPrice:259, category:'限定周边', tag:'新品', rating:4.7, reviews:3211, stock:120, desc:'含阿米娅Q版搪胶手办(12cm)、罗德岛证件夹、指挥官徽章×3套装礼盒。', specs:['标准版','豪华礼盒版'], attrs:{包含:'手办+证件夹+徽章',材质:'PVC搪胶',尺寸:'12cm',产地:'中国'} },
        { id:5, name:'源石能量饮料 × 12罐装', price:89, originalPrice:120, category:'罗德岛食品', tag:'特惠', rating:4.5, reviews:8876, stock:300, desc:'罗德岛官方联名能量饮料，含矿物质与电解质，战斗前最佳补给选择。三种口味。', specs:['薄荷柠檬','原味矿物质','热带风味'], attrs:{容量:'330ml×12',卡路里:'80kcal/罐',成分:'牛磺酸、咖啡因、B族维生素',保质期:'18个月'} },
        { id:6, name:'W的爆炸物纪念摆件', price:666, originalPrice:888, category:'限定周边', tag:'限定', rating:4.9, reviews:432, stock:5, desc:'W角色同款道具复刻，树脂材质，精细涂装，限量500件，附W亲笔签名卡。', specs:['普通版','爆炸版(带声光效果)'], attrs:{材质:'ABS树脂+金属',尺寸:'15×8×6cm',限量:'全球500件',附件:'签名卡+展示台'} },
        { id:7, name:'罗德岛战术急救喷雾', price:149, originalPrice:199, category:'战术装备', tag:'热销', rating:4.6, reviews:2109, stock:75, desc:'含源石萃取物的快速愈合喷雾，适用于轻度割伤、擦伤，战场必备。', specs:['50ml','100ml','200ml'], attrs:{成分:'源石萃取物+透明质酸',容量:'100ml',使用次数:'约200次',适用:'轻中度创伤'} },
        { id:8, name:'塔露拉异镜联名T恤', price:259, originalPrice:329, category:'服装配件', tag:'新品', rating:4.4, reviews:765, stock:45, desc:'塔露拉×异镜联名款，前印异镜LOGO，后印塔露拉全身图，重磅纯棉面料。', specs:['S','M','L','XL','2XL'], attrs:{材质:'350g重磅纯棉',版型:'宽松直筒',工艺:'DTG数码直喷',洗涤:'30度冷水机洗'} },
        { id:9, name:'陈·剑圣风雅刀鞘套装', price:1299, originalPrice:1799, category:'限定周边', tag:'限定', rating:5.0, reviews:221, stock:3, desc:'陈角色同款装饰刀鞘，黄金雕花工艺，附赠炎国纹样展示架，全球限量200套。', specs:['收藏版'], attrs:{材质:'黄铜镀金+紫檀木',工艺:'手工雕花',限量:'全球200套',附件:'展示架+证书+礼盒'} },
        { id:10, name:'罗德岛指挥官帽', price:129, originalPrice:169, category:'服装配件', tag:'热销', rating:4.7, reviews:4321, stock:200, desc:'官方指挥官制式帽，前端绣罗德岛徽章，可调节头围，全季通用款。', specs:['均码（可调节）'], attrs:{材质:'棉麻混纺',帽围:'54-60cm可调',颜色:'经典黑/米白',工艺:'刺绣徽章'} },
        { id:11, name:'雪雉精英定制夹克', price:899, originalPrice:1199, category:'服装配件', tag:'新品', rating:4.8, reviews:312, stock:22, desc:'雪雉联名飞行员夹克，正面绣雪雉图案，内里印雪域特训场景图，限量发售。', specs:['S','M','L','XL'], attrs:{材质:'牛皮+棉内衬',版型:'修身飞行员款',限量:'1000件',附件:'专属吊牌+防伪码'} },
        { id:12, name:'罗德岛战地口粮套装', price:168, originalPrice:228, category:'罗德岛食品', tag:'特惠', rating:4.3, reviews:5567, stock:150, desc:'7天份高能量野战口粮，含主食棒×7、能量胶×14、电解质粉×7，便携铝箔包装。', specs:['7日份','14日份','30日份'], attrs:{热量:'2000kcal/套',保质期:'5年',重量:'1.5kg(7日份)',包装:'军规铝箔袋'} },
        { id:13, name:'凛冬特训防风冲锋衣', price:799, originalPrice:1099, category:'服装配件', tag:'热销', rating:4.9, reviews:891, stock:35, desc:'参照凛冬实地作战数据设计，三层复合防水面料，-20°C极寒环境适用。', specs:['S','M','L','XL','2XL'], attrs:{材质:'Gore-Tex仿生面料',防水等级:'20000mm',适温:'-20°C至10°C',重量:'680g'} },
        { id:14, name:'玛恩纳深海主题马克杯', price:98, originalPrice:128, category:'限定周边', tag:'新品', rating:4.6, reviews:1456, stock:80, desc:'玛恩纳联名深海主题陶瓷杯，采用温变釉技术，遇热现出深海图案，容量400ml。', specs:['单杯','双杯套装'], attrs:{材质:'高温陶瓷',容量:'400ml',工艺:'温变釉',特效:'遇热显图'} },
        { id:15, name:'罗德岛医疗部制服套装', price:1588, originalPrice:1988, category:'服装配件', tag:'限定', rating:4.8, reviews:178, stock:12, desc:'一比一复刻罗德岛医疗部制服，含上衣+裤子+臂章+证件牌全套，演出级别用料。', specs:['S','M','L','XL'], attrs:{含:'上衣+裤+臂章+证件',材质:'医用级白色聚酯纤维',工艺:'刺绣+印花',场合:'演出/展会/收藏'} },
        { id:16, name:'源石矿晶展示台套装', price:488, originalPrice:688, category:'限定周边', tag:'特惠', rating:4.7, reviews:634, stock:28, desc:'天然矿石仿源石工艺品×3块+亚克力展示台+LED底座，营造原矿展览级视觉效果。', specs:['3件套','6件套'], attrs:{材质:'天然石英+LED底座',尺寸:'约5-8cm/块',灯光:'七彩渐变LED',电源:'USB供电'} }
    ];

    // ==================== 状态管理 ====================
    let cart = [];
    let wishlist = [];
    let currentUser = null;
    let orders = [];
    let claimedCoupons = [];
    let activeCoupon = null;
    let currentFilter = 'all';

    // ==================== 持久化（混合策略：登录用API，未登录用localStorage）====================
    function saveState() {
        // 用户信息和优惠券始终存本地，方便刷新恢复登录状态
        localStorage.setItem('rhodesUser', JSON.stringify(currentUser));
        localStorage.setItem('rhodesCoupons', JSON.stringify(claimedCoupons));
        // 购物车/心愿单：登录后增删改已实时通过 API 同步（addToCart/removeFromCart/toggleWishlist 等），
        // 此处仅做本地兜底，确保离线或 API 失败时数据不丢失
        localStorage.setItem('rhodesCart', JSON.stringify(cart));
        localStorage.setItem('rhodesWishlist', JSON.stringify(wishlist));
    }

    async function loadState() {
        // 恢复用户登录状态
        try {
            currentUser = JSON.parse(localStorage.getItem('rhodesUser')) || null;
            claimedCoupons = JSON.parse(localStorage.getItem('rhodesCoupons')) || [];
        } catch(e) {
            currentUser = null; claimedCoupons = [];
        }

        if (currentUser) {
            // 从服务器加载购物车和心愿单
            try {
                const cartRes = await apiGet(`/cart/${currentUser.id}`);
                if (cartRes.code === 0) cart = cartRes.data;

                const wlRes = await apiGet(`/wishlist/${currentUser.id}`);
                if (wlRes.code === 0) wishlist = wlRes.data;

                const ordersRes = await apiGet(`/orders/${currentUser.id}`);
                if (ordersRes.code === 0) orders = ordersRes.data;
            } catch(e) {
                // 服务器不可达，回退到 localStorage
                cart = JSON.parse(localStorage.getItem('rhodesCart')) || [];
                wishlist = JSON.parse(localStorage.getItem('rhodesWishlist')) || [];
                orders = [];
            }
        } else {
            // 未登录：使用本地存储
            cart = JSON.parse(localStorage.getItem('rhodesCart')) || [];
            wishlist = JSON.parse(localStorage.getItem('rhodesWishlist')) || [];
            orders = [];
        }
    }

    // ==================== 初始化 ====================
    document.addEventListener('DOMContentLoaded', async function() {
        // 显示开启动画
        showSplashScreen();
        
        await loadProducts();     // 先从后端加载商品数据
        await loadState();        // 再加载用户状态
        renderProducts('all');
        setupEventListeners();
        setupScrollAnimations();
        initHeroCarousel();       // 初始化 Hero 轮播
        updateCartUI();
        updateWishlistUI();
        updateUserUI();
        restoreClaimedCoupons();
        setupCustomerService();  // 初始化客服系统
        
        // 隐藏开启动画
        hideSplashScreen();
    });

    // ==================== 开启动画 ====================
    function showSplashScreen() {
        const splash = document.getElementById('splashScreen');
        const progress = document.getElementById('loadingProgress');
        const loadingText = document.getElementById('loadingText');
        
        let percent = 0;
        const interval = setInterval(() => {
            percent += Math.random() * 15 + 5;
            if (percent >= 100) {
                percent = 100;
                clearInterval(interval);
            }
            progress.style.width = percent + '%';
            loadingText.textContent = Math.floor(percent) + '%';
        }, 150);
    }

    function hideSplashScreen() {
        const splash = document.getElementById('splashScreen');
        setTimeout(() => {
            splash.classList.add('hidden');
            // 动画完全结束后移除 DOM（可选）
            setTimeout(() => {
                splash.style.display = 'none';
            }, 600);
        }, 2500); // 2.5 秒后隐藏
    }

    // ==================== 用户系统 ====================
    function updateUserUI() {
        const btn = document.getElementById('userBtn');
        if (currentUser) {
            btn.style.borderColor = 'var(--success)';
            btn.style.color = 'var(--success)';
            btn.title = currentUser.name;
        } else {
            btn.style.borderColor = '';
            btn.style.color = '';
            btn.title = '登录';
        }
    }

    function openLogin() {
        document.getElementById('loginOverlay').classList.add('active');
        document.getElementById('loginModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLogin() {
        document.getElementById('loginOverlay').classList.remove('active');
        document.getElementById('loginModal').classList.remove('active');
        document.body.style.overflow = '';
    }

    function switchLoginTab(tab) {
        document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.login-panel').forEach(p => p.classList.remove('active'));
        if (tab === 'login') {
            document.querySelectorAll('.login-tab')[0].classList.add('active');
            document.getElementById('loginPanel').classList.add('active');
        } else {
            document.querySelectorAll('.login-tab')[1].classList.add('active');
            document.getElementById('registerPanel').classList.add('active');
        }
    }

    function openUserCenter() {
        if (!currentUser) { openLogin(); return; }
        const initial = currentUser.name.charAt(0).toUpperCase();
        document.getElementById('userAvatar').textContent = initial;
        document.getElementById('userDisplayName').textContent = currentUser.name;
        document.getElementById('userDisplayEmail').textContent = currentUser.email;
        document.getElementById('userLevelBadge').textContent = 'LV.' + Math.min(5, Math.floor(orders.length / 2) + 1);
        document.getElementById('statOrders').textContent = orders.length;
        document.getElementById('statWishlist').textContent = wishlist.length;
        document.getElementById('statCoupons').textContent = claimedCoupons.length;

        const ordersEl = document.getElementById('userOrdersList');
        if (orders.length === 0) {
            ordersEl.innerHTML = '<div style="text-align:center;padding:24px 0;color:var(--text-secondary);font-size:13px;">暂无订单记录</div>';
        } else {
            ordersEl.innerHTML = orders.slice(-3).reverse().map(o => `
                <div class="order-item">
                    <div>
                        <div style="font-weight:600;margin-bottom:2px;">${escapeHtml(o.items[0]?.name || '')}${o.items.length > 1 ? ' 等' + o.items.length + '件' : ''}</div>
                        <div class="order-id">订单号：${escapeHtml(o.id)}</div>
                    </div>
                    <span class="order-status shipped">已发货</span>
                    <span class="order-price">¥${o.total}</span>
                </div>
            `).join('');
        }

        document.getElementById('userOverlay').classList.add('active');
        document.getElementById('userCenterModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeUserCenter() {
        document.getElementById('userOverlay').classList.remove('active');
        document.getElementById('userCenterModal').classList.remove('active');
        document.body.style.overflow = '';
    }

    function logout() {
        currentUser = null;
        localStorage.removeItem('rhodesToken');
        saveState();
        updateUserUI();
        closeUserCenter();
        showToast('已安全退出登录', 'info');
    }

    // ==================== 渲染商品 ====================
    let compareList = []; // 对比列表，最多3个

    function renderProducts(filter) {
        currentFilter = filter;
        const grid = document.getElementById('productGrid');

        // 显示骨架屏（增强版）
        grid.innerHTML = Array.from({length: 6}, () => `
            <div class="skeleton-card">
                <div class="skeleton skeleton-img"></div>
                <div class="skeleton-body">
                    <div class="skeleton skeleton-line medium"></div>
                    <div class="skeleton skeleton-line short"></div>
                    <div class="skeleton skeleton-line medium"></div>
                    <div class="skeleton-actions">
                        <div class="skeleton skeleton-line price"></div>
                        <div class="skeleton skeleton-line btn"></div>
                    </div>
                </div>
            </div>
        `).join('');

        setTimeout(() => {
            let filtered = filter === 'all' ? products : products.filter(p => p.category_key === filter);

            // 应用排序
            const sortBy = document.getElementById('sortSelect').value;
            filtered = sortProducts(filtered, sortBy);

            // 更新商品计数
            document.getElementById('productCount').textContent = `共 ${filtered.length} 件`;

            if (filtered.length === 0) {
                grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128269;</div><h3>暂无相关商品</h3><p>试试其他分类吧</p></div>';
                return;
            }

            grid.innerHTML = filtered.map(p => {
                const isWishlisted = wishlist.includes(p.id);
                const stockClass = p.stock <= 5 ? 'low' : p.stock === 0 ? 'out' : '';
                const stockText = p.stock === 0 ? '已售罄' : p.stock <= 5 ? `仅剩 ${p.stock} 件` : `库存 ${p.stock} 件`;
                const stars = '★'.repeat(Math.floor(p.rating)) + (p.rating % 1 ? '☆' : '');
                const isCompared = compareList.some(c => c.id === p.id);
                const safeName = escapeHtml(p.name);
                const safeDesc = escapeHtml(p.desc);
                const safeTag = p.tag ? escapeHtml(p.tag) : '';
                return `
                    <div class="product-card" data-id="${p.id}" tabindex="0" role="article" aria-label="${safeName}, ¥${p.price}">
                        <div class="product-image" onclick="openProductDetail(${p.id})">
                            ${p.tag ? `<span class="product-tag ${p.tag === 'HOT' ? 'hot' : p.tag === 'LIMITED' ? 'limited' : p.tag === 'SALE' ? 'sale' : ''}">${safeTag}</span>` : ''}
                            <button class="product-wishlist-btn ${isWishlisted ? 'wishlisted' : ''}" onclick="toggleWishlist(${p.id}, event)" title="收藏" aria-label="${isWishlisted ? '取消收藏' : '加入收藏'}">&#10084;</button>
                            <button class="compare-check-btn" style="position:absolute;top:54px;right:10px;width:38px;height:38px;background:rgba(10,14,26,0.85);border:1px solid ${isCompared ? 'var(--accent-blue)' : 'var(--border-color)'};color:${isCompared ? 'var(--accent-blue)' : 'var(--text-secondary)'};cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;z-index:2;border-radius:50%;backdrop-filter:blur(8px);transition:all 0.35s;opacity:0;" onmouseover="this.style.opacity=1" onclick="toggleCompare(${p.id}, event)" title="${isCompared ? '取消对比' : '加入对比'}" aria-label="对比">&#9878;</button>
                            <img data-src="${p.image}" alt="${safeName}" class="product-img lazy-img" loading="lazy"
                                 src="data:image/svg+xml,${encodeURIComponent('<svg viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\"><rect width=\"100\" height=\"100\" fill=\"#151b2d\" rx=\"8\"/><text x=\"50\" y=\"55\" text-anchor=\"middle\" font-size=\"12\" fill=\"#1e293b\">...</text></svg>')}" />
                        </div>
                        <div class="product-info">
                            <div class="product-rating">
                                <span class="stars">${stars}</span>
                                <span class="rating-count">${p.rating} (${p.reviews})</span>
                            </div>
                            <h3 class="product-name" onclick="openProductDetail(${p.id})">${safeName}</h3>
                            <p class="product-desc">${safeDesc}</p>
                            <div class="product-footer">
                                <div>
                                    <div class="product-price">¥${p.price}${p.originalPrice ? `<span class="original">¥${p.originalPrice}</span>` : ''}</div>
                                    <div class="product-stock ${stockClass}">${stockText}</div>
                                </div>
                                <button class="add-cart-btn" onclick="addToCart(${p.id}, event)" title="加入购物车" ${p.stock === 0 ? 'disabled' : ''} aria-label="将${p.name}加入购物车">
                                    <span class="add-cart-icon">&#128722;</span>
                                    <span class="add-cart-text">加入购物车</span>
                                </button>
                            </div>
                        </div>
                    </div>`;
            }).join('');

            // 懒加载图片
            setupLazyImages();
            // 显示对比按钮
            updateCompareButtonVisibility();

            setTimeout(() => {
                document.querySelectorAll('.product-card').forEach((c, i) => {
                    setTimeout(() => c.classList.add('visible'), i * 60);
                });
            }, 30);
        }, 200);
    }

    // 排序函数
    function sortProducts(products, sortBy) {
        const sorted = [...products];
        switch(sortBy) {
            case 'price_asc':  sorted.sort((a, b) => a.price - b.price); break;
            case 'price_desc': sorted.sort((a, b) => b.price - a.price); break;
            case 'rating':     sorted.sort((a, b) => b.rating - a.rating); break;
            case 'sales':      sorted.sort((a, b) => b.reviews - a.reviews); break;
            default: break;
        }
        return sorted;
    }

    // 图片懒加载（增强版：带 fade-in 过渡）
    function setupLazyImages() {
        if ('IntersectionObserver' in window) {
            const lazyObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.getAttribute('data-src');
                        if (src) {
                            // 创建临时图片预加载，完成后替换
                            const tempImg = new Image();
                            tempImg.onload = () => {
                                img.src = src;
                                img.classList.remove('lazy-img');
                                img.classList.add('lazy-loaded');
                            };
                            tempImg.onerror = () => {
                                img.src = `data:image/svg+xml,${encodeURIComponent('<svg viewBox="0 0 300 260" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="260" fill="#151b2d"/><text x="150" y="125" text-anchor="middle" font-size="14" fill="#1e293b" font-family="sans-serif">图片加载失败</text><text x="150" y="145" text-anchor="middle" font-size="10" fill="#334155" font-family="sans-serif">IMAGE ERROR</text></svg>')}`;
                                img.classList.remove('lazy-img');
                                img.classList.add('lazy-loaded');
                            };
                            tempImg.src = src;
                        }
                        lazyObserver.unobserve(img);
                    }
                });
            }, { rootMargin: '200px' });

            document.querySelectorAll('.lazy-img').forEach(img => lazyObserver.observe(img));
        } else {
            // 降级：直接加载
            document.querySelectorAll('.lazy-img').forEach(img => {
                const src = img.getAttribute('data-src');
                if (src) {
                    img.src = src;
                    img.classList.remove('lazy-img');
                    img.classList.add('lazy-loaded');
                }
            });
        }
    }

    // ==================== 商品对比功能 ====================
    function toggleCompare(productId, event) {
        if (event) event.stopPropagation();
        const p = products.find(x => x.id === productId);
        if (!p) return;

        const idx = compareList.findIndex(c => c.id === productId);
        if (idx > -1) {
            compareList.splice(idx, 1);
            showToast(`"${p.name}" 已移出对比栏`, 'info');
        } else {
            if (compareList.length >= 3) {
                showToast('最多同时对比3件商品，请先移除一个', 'warning');
                return;
            }
            compareList.push(p);
            showToast(`"${p.name}" 已加入对比栏`, 'success');
        }

        updateCompareBar();
        renderProducts(currentFilter);
    }

    function removeCompareItem(index) {
        if (index < compareList.length) {
            const name = compareList[index].name;
            compareList.splice(index, 1);
            showToast(`"${name}" 已移出对比栏`, 'info');
            updateCompareBar();
            renderProducts(currentFilter);
        }
    }

    function clearCompare() {
        if (compareList.length === 0) return;
        compareList = [];
        showToast('已清空对比栏', 'info');
        updateCompareBar();
        renderProducts(currentFilter);
    }

    function updateCompareBar() {
        const bar = document.getElementById('compareBar');
        const slots = document.getElementById('compareSlots');
        const startBtn = document.getElementById('compareStartBtn');

        bar.classList.toggle('active', compareList.length > 0);

        const slotEls = slots.querySelectorAll('.compare-slot');
        slotEls.forEach((slot, i) => {
            if (i < compareList.length) {
                slot.classList.add('filled');
                slot.innerHTML = `
                    <img src="${compareList[i].image}" alt="${escapeHtml(compareList[i].name)}" onerror="this.style.display='none';this.parentElement.textContent='${escapeHtml(compareList[i].name.substring(0,4))}';this.parentElement.style.fontSize='11px';this.parentElement.style.color='var(--accent-blue)'" />
                    <button class="remove-compare" onclick="event.stopPropagation();removeCompareItem(${i})">&#10005;</button>
                `;
            } else {
                slot.classList.remove('filled');
                slot.innerHTML = '+ 添加';
            }
        });

        startBtn.disabled = compareList.length < 2;
    }

    function updateCompareButtonVisibility() {
        // 对比按钮在hover时显示
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                const btn = card.querySelector('.compare-check-btn');
                if (btn) btn.style.opacity = '1';
            });
            card.addEventListener('mouseleave', () => {
                const btn = card.querySelector('.compare-check-btn');
                if (btn) btn.style.opacity = '0';
            });
        });
    }

    function openCompareModal() {
        if (compareList.length < 2) {
            showToast('请至少选择2件商品进行对比', 'warning');
            return;
        }

        const allKeys = new Set();
        compareList.forEach(p => {
            allKeys.add('价格');
            allKeys.add('评分');
            allKeys.add('分类');
            allKeys.add('库存');
            if (p.attrs) Object.keys(p.attrs).forEach(k => allKeys.add(k));
        });

        document.getElementById('compareContainer').innerHTML = `
            <button class="compare-close" onclick="closeCompareModal()">&#10005;</button>
            <h2 style="font-size:20px;letter-spacing:2px;margin-bottom:4px;">商品对比</h2>
            <p style="font-size:13px;color:var(--text-secondary);">共 ${compareList.length} 件商品</p>
            <table class="compare-table">
                <thead>
                    <tr>
                        <th>属性</th>
                        ${compareList.map(p => `
                            <th>
                                <img src="${p.image}" alt="${escapeHtml(p.name)}" class="compare-img" onerror="this.style.display='none'" />
                                <div class="compare-name">${escapeHtml(p.name)}</div>
                                <div class="compare-price">¥${p.price}</div>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>价格</td>
                        ${compareList.map(p => `<td>¥${p.price}${p.originalPrice ? ` <span style="text-decoration:line-through;color:var(--text-secondary);font-size:12px;">¥${p.originalPrice}</span>` : ''}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>评分</td>
                        ${compareList.map(p => `<td>${'★'.repeat(Math.floor(p.rating))} ${p.rating} (${p.reviews}评)</td>`).join('')}
                    </tr>
                    <tr>
                        <td>分类</td>
                        ${compareList.map(p => `<td>${escapeHtml(p.category)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>库存</td>
                        ${compareList.map(p => `<td style="color:${p.stock <= 5 ? 'var(--warning)' : p.stock === 0 ? 'var(--danger)' : 'var(--success)'}">${p.stock === 0 ? '已售罄' : p.stock + '件'}</td>`).join('')}
                    </tr>
                    ${Array.from(allKeys).filter(k => !['价格','评分','分类','库存'].includes(k)).map(key => `
                        <tr>
                            <td>${escapeHtml(key)}</td>
                            ${compareList.map(p => `<td>${escapeHtml((p.attrs && p.attrs[key]) || '-')}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="margin-top:20px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                ${compareList.map(p => `
                    <button class="btn-primary" style="padding:10px 20px;font-size:12px;" onclick="addToCart(${p.id});closeCompareModal()">购买 ${escapeHtml(p.name.substring(0,8))}</button>
                `).join('')}
            </div>
        `;

        document.getElementById('compareOverlay').classList.add('active');
        document.getElementById('compareModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeCompareModal() {
        document.getElementById('compareOverlay').classList.remove('active');
        document.getElementById('compareModal').classList.remove('active');
        document.body.style.overflow = '';
    }

    // ==================== 分类筛选 ====================
    function filterProducts(category) {
        document.querySelectorAll('.filter-tag').forEach(b => {
            b.classList.toggle('active', b.dataset.filter === category);
        });
        document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(l => {
            l.classList.toggle('active', l.dataset.category === category);
        });
        renderProducts(category);
        document.getElementById('mobileMenu').classList.remove('active');
        document.getElementById('mobileMenuBtn').classList.remove('active');
    }

    function filterAndScroll(category) {
        filterProducts(category);
        document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
    }

    function showAllProducts() {
        filterProducts('all');
        document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
    }

    // ==================== 购物车 ====================
    async function addToCart(productId, event) {
        if (event) event.stopPropagation();
        const product = products.find(p => p.id === productId);
        if (!product || product.stock === 0) return;

        // 检查库存：获取当前购物车中该商品的数量
        const existing = cart.find(i => i.id === productId);
        const currentCartQty = existing ? existing.qty : 0;
        
        // 如果加入后会超过库存，则提示用户
        if (currentCartQty >= product.stock) {
            showToast('库存不足', 'warning');
            return;
        }

        if (currentUser) {
            // 已登录：通知服务器
            try {
                const res = await apiPost(`/cart/${currentUser.id}/add`, { productId, qty: 1 });
                if (res.code === 0) {
                    cart = res.data;
                }
            } catch(e) { /* 服务器不可达，降级本地 */ }
        }
        // 同步本地状态（离线也能用）
        if (existing) { existing.qty++; }
        else { cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 }); }

        updateCartUI();
        localStorage.setItem('rhodesCart', JSON.stringify(cart));
        showToast(`"${product.name}" 已加入购物车`, 'success');
        
        // 按钮动画效果
        if (event) {
            const btn = event.currentTarget || event.target.closest('.add-cart-btn');
            if (btn) {
                btn.classList.add('added');
                
                // 更新按钮文字
                const iconSpan = btn.querySelector('.add-cart-icon');
                const textSpan = btn.querySelector('.add-cart-text');
                if (iconSpan) iconSpan.textContent = '✓';
                if (textSpan) textSpan.textContent = '已添加';
                
                // 恢复原状
                setTimeout(() => {
                    btn.classList.remove('added');
                    if (iconSpan) iconSpan.textContent = '🛒';
                    if (textSpan) textSpan.textContent = '加入购物车';
                }, 1500);
            }
        }
    }

    async function removeFromCart(productId) {
        if (currentUser) {
            try {
                await apiPut(`/cart/${currentUser.id}/update`, { productId, qty: 0 });
            } catch(e) {}
        }
        cart = cart.filter(i => i.id !== productId);
        updateCartUI();
        localStorage.setItem('rhodesCart', JSON.stringify(cart));
        showToast('已从购物车移除', 'info');
    }

    async function updateCartQty(productId, delta) {
        const item = cart.find(i => i.id === productId);
        if (!item) return;
        item.qty += delta;
        if (item.qty <= 0) { removeFromCart(productId); return; }

        if (currentUser) {
            try {
                await apiPut(`/cart/${currentUser.id}/update`, { productId, qty: item.qty });
            } catch(e) {}
        }
        updateCartUI();
        localStorage.setItem('rhodesCart', JSON.stringify(cart));
    }

    function updateCartUI() {
        const totalQty = cart.reduce((s, i) => s + i.qty, 0);
        const countEl = document.getElementById('cartCount');
        countEl.textContent = totalQty;
        countEl.style.display = totalQty > 0 ? 'flex' : 'none';
        document.getElementById('cartItemCount').textContent = totalQty > 0 ? `(${totalQty})` : '';

        const itemsEl = document.getElementById('cartItems');
        const footerEl = document.getElementById('cartFooter');

        if (cart.length === 0) {
            itemsEl.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">&#128722;</div><p>购物车是空的</p><button class="btn-primary" style="margin-top:8px;padding:10px 24px;" onclick="closeCart();document.getElementById('products').scrollIntoView({behavior:'smooth'})">去购物 &#8594;</button></div>`;
            footerEl.style.display = 'none';
        } else {
            itemsEl.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-img">
                        <svg width="36" height="36" viewBox="0 0 100 100" fill="none"><rect x="10" y="10" width="80" height="80" rx="2" stroke="rgba(0,212,255,0.3)" stroke-width="1.5"/><path d="M25 50 L50 25 L75 50 L65 50 L65 75 L35 75 L35 50 Z" fill="rgba(0,212,255,0.1)" stroke="rgba(0,212,255,0.3)" stroke-width="1"/></svg>
                    </div>
                    <div class="cart-item-info">
                        <div class="cart-item-name">${escapeHtml(item.name)}</div>
                        <div class="cart-item-price">¥${item.price}</div>
                        <div class="cart-item-qty">
                            <button class="qty-btn" onclick="updateCartQty(${item.id},-1)">−</button>
                            <span class="qty-value">${item.qty}</span>
                            <button class="qty-btn" onclick="updateCartQty(${item.id},1)">+</button>
                        </div>
                        <div class="cart-item-subtotal">小计：¥${(item.price * item.qty).toFixed(0)}</div>
                    </div>
                    <button class="cart-item-remove" onclick="removeFromCart(${item.id})">&#10005;</button>
                </div>
            `).join('');
            footerEl.style.display = 'block';
            renderCartSummary();
        }
    }

    function renderCartSummary() {
        const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
        const discount = activeCoupon ? activeCoupon.discount : 0;
        const shipping = subtotal > 199 ? 0 : 15;
        const total = Math.max(0, subtotal - discount + shipping);
        document.getElementById('cartSummary').innerHTML = `
            <div class="cart-summary-row"><span>商品小计</span><span>¥${subtotal}</span></div>
            ${discount > 0 ? `<div class="cart-summary-row" style="color:var(--success)"><span>优惠券折扣</span><span>-¥${discount}</span></div>` : ''}
            <div class="cart-summary-row"><span>运费</span><span>${shipping === 0 ? '<span style="color:var(--success)">包邮</span>' : '¥' + shipping}</span></div>
            <div class="cart-total-row"><span>合计</span><span class="cart-total-price">¥${total}</span></div>
        `;
    }

    function openCart() {
        document.getElementById('cartOverlay').classList.add('active');
        document.getElementById('cartSidebar').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeCart() {
        document.getElementById('cartOverlay').classList.remove('active');
        document.getElementById('cartSidebar').classList.remove('active');
        document.body.style.overflow = '';
    }

    // ==================== 心愿单 ====================
    async function toggleWishlist(productId, event) {
        if (event) event.stopPropagation();

        let action = 'added';
        if (currentUser) {
            try {
                const res = await apiPost(`/wishlist/${currentUser.id}/toggle`, { productId });
                if (res.code === 0) {
                    wishlist = res.data;
                    action = res.action;
                }
            } catch(e) {
                // 降级本地操作
                const idx = wishlist.indexOf(productId);
                if (idx > -1) { wishlist.splice(idx, 1); action = 'removed'; }
                else { wishlist.push(productId); action = 'added'; }
            }
        } else {
            const idx = wishlist.indexOf(productId);
            if (idx > -1) { wishlist.splice(idx, 1); action = 'removed'; }
            else { wishlist.push(productId); action = 'added'; }
            localStorage.setItem('rhodesWishlist', JSON.stringify(wishlist));
        }

        if (action === 'removed') {
            showToast('已从心愿单移除', 'info');
        } else {
            const p = products.find(x => x.id === productId);
            showToast(`"${p ? p.name : ''}" 已加入心愿单`, 'success');
            // 心形粒子动画
            if (event) {
                createHeartParticles(event.clientX, event.clientY);
            }
        }
        updateWishlistUI();
        // 触发放大动画
        const card = document.querySelector(`[data-id="${productId}"]`);
        if (card) {
            const btn = card.querySelector('.product-wishlist-btn');
            if (btn) {
                btn.classList.toggle('wishlisted', wishlist.includes(productId));
                if (action === 'added') {
                    btn.style.animation = 'heartBeat 0.6s ease';
                    setTimeout(() => btn.style.animation = '', 600);
                }
            }
        }
    }

    function createHeartParticles(x, y) {
        const colors = ['#ff6b6b', '#ff8787', '#ffa8a8', '#a855f7', '#00d4ff'];
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'wishlist-particle';
            particle.textContent = '❤';
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.setProperty('--tx', (Math.random() - 0.5) * 80 + 'px');
            particle.style.setProperty('--ty', -(Math.random() * 60 + 30) + 'px');
            particle.style.color = colors[Math.floor(Math.random() * colors.length)];
            particle.style.fontSize = (Math.random() * 10 + 12) + 'px';
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 800);
        }
    }

    function updateWishlistUI() {
        const countEl = document.getElementById('wishlistCount');
        countEl.textContent = wishlist.length;
        countEl.style.display = wishlist.length > 0 ? 'flex' : 'none';
    }

    function openWishlist() {
        const itemsEl = document.getElementById('wishlistItems');
        if (wishlist.length === 0) {
            itemsEl.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">&#10084;</div><p>还没有收藏商品</p></div>`;
        } else {
            itemsEl.innerHTML = wishlist.map(id => {
                const p = products.find(x => x.id === id);
                if (!p) return '';
                return `
                    <div class="cart-item">
                        <div class="cart-item-img">
                            <svg width="36" height="36" viewBox="0 0 100 100" fill="none"><rect x="10" y="10" width="80" height="80" rx="2" stroke="rgba(0,212,255,0.3)" stroke-width="1.5"/><path d="M25 50 L50 25 L75 50 L65 50 L65 75 L35 75 L35 50 Z" fill="rgba(0,212,255,0.1)" stroke="rgba(0,212,255,0.3)" stroke-width="1"/></svg>
                        </div>
                        <div class="cart-item-info">
                            <div class="cart-item-name">${escapeHtml(p.name)}</div>
                            <div class="cart-item-price">¥${p.price}</div>
                            <button class="qty-btn" style="margin-top:6px;width:auto;padding:0 10px;" onclick="addToCart(${p.id});showToast('已加入购物车','success')">+ 加入购物车</button>
                        </div>
                        <button class="cart-item-remove" onclick="toggleWishlist(${p.id}); openWishlist()">&#10005;</button>
                    </div>`;
            }).join('');
        }
        document.getElementById('wishlistOverlay').classList.add('active');
        document.getElementById('wishlistSidebar').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeWishlist() {
        document.getElementById('wishlistOverlay').classList.remove('active');
        document.getElementById('wishlistSidebar').classList.remove('active');
        document.body.style.overflow = '';
    }

    // ==================== 优惠券 ====================
    const couponCodes = {
        'RHODES50': { discount: 50, minAmount: 299, desc: '满299减50' },
        'TACTICAL30': { discount: 30, minAmount: 199, desc: '满199减30' },
        'FREESHIP': { discount: 15, minAmount: 0, desc: '免运费' },
        'NEW88': { discount: 0, rate: 0.88, minAmount: 0, desc: '88折优惠' }
    };

    function claimCoupon(id, code) {
        if (claimedCoupons.includes(code)) {
            showToast('已领取过该优惠券', 'warning'); return;
        }
        claimedCoupons.push(code);
        const card = document.getElementById('coupon' + id);
        card.classList.add('claimed');
        const btn = card.querySelector('.coupon-btn');
        btn.textContent = '已领取';
        saveState();
        showToast(`优惠券 ${code} 已领取，可在结算时使用`, 'success');
    }

    function restoreClaimedCoupons() {
        claimedCoupons.forEach(code => {
            const couponMap = { 'RHODES50': 1, 'TACTICAL30': 2, 'NEW88': 3, 'FREESHIP': 4 };
            const id = couponMap[code];
            if (id) {
                const card = document.getElementById('coupon' + id);
                if (card) {
                    card.classList.add('claimed');
                    const btn = card.querySelector('.coupon-btn');
                    if (btn) btn.textContent = '已领取';
                }
            }
        });
    }

    async function applyCoupon() {
        const code = document.getElementById('couponInput').value.trim().toUpperCase();
        if (!code) { showToast('请输入优惠码', 'warning'); return; }
        const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

        try {
            const res = await apiPost('/coupon/validate', { code, subtotal });
            if (res.code === 0) {
                activeCoupon = res.data;
                renderCartSummary();
                showToast(`优惠码"${code}"已使用：${res.data.desc}`, 'success');
            } else {
                showToast(res.message || '无效的优惠码', 'error');
            }
        } catch(e) {
            // 降级本地校验
            const localCoupons = { 'RHODES50': {discount:50,minAmount:299,desc:'满299减50'}, 'TACTICAL30': {discount:30,minAmount:199,desc:'满199减30'}, 'FREESHIP': {discount:15,minAmount:0,desc:'免运费'}, 'NEW88': {discount:0,rate:0.88,minAmount:0,desc:'全场88折'} };
            const coupon = localCoupons[code];
            if (!coupon) { showToast('无效的优惠码', 'error'); return; }
            if (subtotal < coupon.minAmount) { showToast(`满${coupon.minAmount}元才可使用`, 'warning'); return; }
            let discount = coupon.discount || Math.floor(subtotal * (1 - (coupon.rate || 1)));
            activeCoupon = { code, discount, desc: coupon.desc };
            renderCartSummary();
            showToast(`优惠码"${code}"已使用：${coupon.desc}`, 'success');
        }
    }

    // ==================== 商品详情 ====================
    let detailQty = 1;
    let selectedSpec = '';

    function openProductDetail(productId) {
        const p = products.find(x => x.id === productId);
        if (!p) return;
        const isWishlisted = wishlist.includes(p.id);
        const savings = p.originalPrice ? p.originalPrice - p.price : 0;
        const stars = '★'.repeat(Math.floor(p.rating)) + (p.rating % 1 ? '☆' : '');
        const stockClass = p.stock <= 5 ? 'low-stock' : p.stock === 0 ? 'out-of-stock' : '';
        const stockText = p.stock === 0 ? '已售罄，暂时缺货' : p.stock <= 5 ? `仅剩 ${p.stock} 件，抓紧下单` : `有货 (库存${p.stock}件)`;

        document.getElementById('productDetailContainer').innerHTML = `
            <div class="product-detail-image">
                <img src="${p.image}" alt="${escapeHtml(p.name)}" class="product-detail-img"
                     onload="this.classList.add('loaded')"
                     onerror="this.outerHTML='<div style=width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#151b2d;color:#1e293b;font-size:14px;>暂无图片</div>'" />
            </div>
            <div class="product-detail-info">
                <button class="product-detail-close" onclick="closeProductDetail()">&#10005;</button>
                ${p.tag ? `<span class="product-detail-tag">${escapeHtml(p.tag)}</span>` : ''}
                <h2 class="product-detail-name">${escapeHtml(p.name)}</h2>
                <div class="product-detail-rating">
                    <span class="detail-stars">${stars}</span>
                    <span class="detail-rating-text">${p.rating} 分 · ${p.reviews} 条评价</span>
                </div>
                <div class="product-detail-price">
                    ¥${p.price}
                    ${p.originalPrice ? `<span class="original">¥${p.originalPrice}</span>` : ''}
                </div>
                ${savings > 0 ? `<div class="product-detail-savings">节省 ¥${savings}（已优惠${Math.round((1-p.price/p.originalPrice)*100)}%）</div>` : ''}
                <p class="product-detail-desc">${escapeHtml(p.desc)}</p>

                ${p.specs && p.specs.length ? `
                <div class="detail-spec-title">规格选择</div>
                <div class="spec-options" id="specOptions">
                    ${p.specs.map((s, i) => `<button class="spec-opt ${i===0?'selected':''}" onclick="selectSpec(this,'${escapeHtml(s)}')">${escapeHtml(s)}</button>`).join('')}
                </div>
                ` : ''}

                <div class="product-detail-stock ${stockClass}">${stockText}</div>

                <div class="product-detail-actions">
                    <div class="qty-control">
                        <button onclick="changeDetailQty(-1)">−</button>
                        <span id="detailQty">1</span>
                        <button onclick="changeDetailQty(1)">+</button>
                    </div>
                    <button class="add-to-cart-btn" onclick="addDetailToCart(${p.id})" ${p.stock===0?'disabled style="opacity:0.5;cursor:not-allowed"':''}>加入购物车</button>
                    <button class="wishlist-btn-detail ${isWishlisted?'active':''}" onclick="toggleWishlist(${p.id}, event); this.classList.toggle('active')" title="收藏">&#10084;</button>
                </div>

                <div class="detail-attrs">
                    ${Object.entries(p.attrs).map(([k,v]) => `<div class="detail-attr"><span class="attr-key">${escapeHtml(k)}</span><span class="attr-val">${escapeHtml(v)}</span></div>`).join('')}
                </div>
            </div>
        `;

        detailQty = 1;
        selectedSpec = p.specs ? p.specs[0] : '';
        document.getElementById('productOverlay').classList.add('active');
        document.getElementById('productModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function selectSpec(el, spec) {
        document.querySelectorAll('.spec-opt').forEach(b => b.classList.remove('selected'));
        el.classList.add('selected');
        selectedSpec = spec;
    }

    function changeDetailQty(delta) {
        detailQty = Math.max(1, detailQty + delta);
        const el = document.getElementById('detailQty');
        if (el) el.textContent = detailQty;
    }

    function addDetailToCart(productId) {
        const p = products.find(x => x.id === productId);
        if (!p) return;
        const existing = cart.find(i => i.id === productId);
        if (existing) { existing.qty += detailQty; }
        else { cart.push({ ...p, qty: detailQty, selectedSpec }); }
        updateCartUI();
        saveState();
        showToast(`已添加 ${detailQty} 件"${p.name}"到购物车`, 'success');
        closeProductDetail();
    }

    function closeProductDetail() {
        document.getElementById('productOverlay').classList.remove('active');
        document.getElementById('productModal').classList.remove('active');
        document.body.style.overflow = '';
        detailQty = 1;
    }

    // ==================== 搜索 ====================
    function setSearch(keyword) {
        document.getElementById('searchInput').value = keyword;
        performSearch();
    }

    function performSearch() {
        const query = document.getElementById('searchInput').value.trim().toLowerCase();
        const resultsEl = document.getElementById('searchResults');
        document.getElementById('searchHotTags').style.display = query ? 'none' : 'block';
        if (!query) { resultsEl.innerHTML = ''; return; }
        const results = products.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.desc.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query)
        );
        if (results.length === 0) {
            resultsEl.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:24px;font-size:13px;">未找到相关商品</p>';
        } else {
            resultsEl.innerHTML = results.map(p => `
                <div class="search-result-item" onclick="openProductDetail(${p.id}); closeSearch();">
                    <div class="search-result-img">
                        <img src="${p.image}" alt="${escapeHtml(p.name)}" class="search-result-pic" loading="lazy"
                             onload="this.classList.add('loaded')"
                             onerror="this.style.display='none'" />
                    </div>
                    <div class="search-result-info">
                        <h4>${escapeHtml(p.name)}</h4>
                        <p>${escapeHtml(p.desc.substring(0,40))}...</p>
                    </div>
                    <span class="search-result-price">¥${p.price}</span>
                </div>
            `).join('');
        }
    }

    function openSearch() {
        document.getElementById('searchOverlay').classList.add('active');
        document.getElementById('searchModal').classList.add('active');
        setTimeout(() => document.getElementById('searchInput').focus(), 100);
        document.body.style.overflow = 'hidden';
    }

    function closeSearch() {
        document.getElementById('searchOverlay').classList.remove('active');
        document.getElementById('searchModal').classList.remove('active');
        document.getElementById('searchInput').value = '';
        document.getElementById('searchResults').innerHTML = '';
        document.getElementById('searchHotTags').style.display = 'block';
        document.body.style.overflow = '';
    }

    // ==================== 结算流程 ====================
    function checkout() {
        if (cart.length === 0) { showToast('购物车是空的', 'warning'); return; }
        if (!currentUser) {
            showToast('请先登录再结算', 'warning');
            closeCart();
            setTimeout(openLogin, 300);
            return;
        }
        closeCart();
        setTimeout(openOrderModal, 300);
    }

    function openOrderModal() {
        const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
        const discount = activeCoupon ? activeCoupon.discount : 0;
        const shipping = subtotal > 199 ? 0 : 15;
        const total = Math.max(0, subtotal - discount + shipping);

        document.getElementById('orderItemsList').innerHTML = `
            <div class="order-item-row" style="font-weight:600;color:var(--text-secondary);font-size:12px;border-bottom:1px solid var(--border-color);padding-bottom:8px;">
                <span class="order-item-name">商品名称</span>
                <span class="order-item-qty">数量</span>
                <span class="order-item-price">小计</span>
            </div>
            ${cart.map(i => `
                <div class="order-item-row">
                    <span class="order-item-name">${escapeHtml(i.name)}</span>
                    <span class="order-item-qty">×${i.qty}</span>
                    <span class="order-item-price">¥${i.price * i.qty}</span>
                </div>
            `).join('')}
        `;
        document.getElementById('orderTotals').innerHTML = `
            <div class="order-total-row"><span>商品合计</span><span>¥${subtotal}</span></div>
            ${discount > 0 ? `<div class="order-total-row" style="color:var(--success)"><span>优惠折扣</span><span>-¥${discount}</span></div>` : ''}
            <div class="order-total-row"><span>运费</span><span>${shipping === 0 ? '包邮' : '¥' + shipping}</span></div>
            <div class="order-total-final"><span>实付金额</span><span>¥${total}</span></div>
        `;
        document.getElementById('orderOverlay').classList.add('active');
        document.getElementById('orderModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeOrderModal() {
        document.getElementById('orderOverlay').classList.remove('active');
        document.getElementById('orderModal').classList.remove('active');
        document.body.style.overflow = '';
    }

    function confirmOrder() {
        const name = document.getElementById('addrName').value.trim();
        const city = document.getElementById('addrCity').value;
        const detail = document.getElementById('addrDetail').value.trim();
        if (!name || !city || !detail) {
            showToast('请填写完整的收货信息', 'warning'); return;
        }
        const orderItems = cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price }));

        const doPlaceOrder = async () => {
            let orderId;
            if (currentUser) {
                // 真实下单到服务器
                try {
                    const res = await apiPost('/orders', {
                        userId: currentUser.id,
                        items: orderItems,
                        address: { name, city, detail },
                        coupon: activeCoupon || null
                    });
                    if (res.code === 0) {
                        orderId = res.data.id;
                        orders.unshift(res.data);
                        cart = [];
                    } else {
                        showToast(res.message || '下单失败，请重试', 'error');
                        return;
                    }
                } catch(e) {
                    showToast('服务器连接失败，尝试本地模式', 'warning');
                    orderId = 'RD' + Date.now().toString().slice(-8);
                    cart = [];
                }
            } else {
                // 未登录本地下单
                orderId = 'RD' + Date.now().toString().slice(-8);
                cart = [];
            }

            activeCoupon = null;
            updateCartUI();
            localStorage.setItem('rhodesCart', JSON.stringify(cart));
            closeOrderModal();
            setTimeout(() => openSuccessModal(orderId), 300);
        };

        doPlaceOrder();
    }

    function openSuccessModal(orderId) {
        document.getElementById('successOrderId').textContent = '订单号：' + orderId;
        document.getElementById('successOverlay').classList.add('active');
        document.getElementById('successModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSuccessModal() {
        document.getElementById('successOverlay').classList.remove('active');
        document.getElementById('successModal').classList.remove('active');
        document.body.style.overflow = '';
    }

    // ==================== 订阅 ====================
    function subscribeNewsletter() {
        const email = document.getElementById('newsletterInput').value.trim();
        if (!email || !email.includes('@')) { showToast('请输入有效邮箱', 'warning'); return; }
        showToast(`${email} 已订阅成功，感谢您的关注！`, 'success');
        document.getElementById('newsletterInput').value = '';
    }

    // ==================== Toast ====================
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
        toast.innerHTML = `<span style="font-size:14px">${icons[type]||'ℹ'}</span> <span>${escapeHtml(message)}</span>`;
        container.appendChild(toast);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => toast.classList.add('show'));
        });
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 450);
        }, 3200);
    }

    // ==================== 事件监听 ====================
    function setupEventListeners() {
        // 搜索
        document.getElementById('searchBtn').addEventListener('click', openSearch);
        document.getElementById('searchClose').addEventListener('click', closeSearch);
        document.getElementById('searchOverlay').addEventListener('click', closeSearch);
        document.getElementById('searchSubmit').addEventListener('click', performSearch);
        document.getElementById('searchInput').addEventListener('input', performSearch);
        document.getElementById('searchInput').addEventListener('keydown', e => { if (e.key === 'Enter') performSearch(); });

        // 购物车
        document.getElementById('cartBtn').addEventListener('click', openCart);
        document.getElementById('cartClose').addEventListener('click', closeCart);
        document.getElementById('cartOverlay').addEventListener('click', closeCart);

        // 心愿单
        document.getElementById('wishlistBtn').addEventListener('click', openWishlist);
        document.getElementById('wishlistOverlay').addEventListener('click', closeWishlist);

        // 用户
        document.getElementById('userBtn').addEventListener('click', () => {
            if (currentUser) openUserCenter();
            else openLogin();
        });
        document.getElementById('loginClose').addEventListener('click', closeLogin);
        document.getElementById('loginOverlay').addEventListener('click', closeLogin);
        document.getElementById('userOverlay').addEventListener('click', closeUserCenter);

        // 登录表单 — 调用后端 API
        document.getElementById('loginForm').addEventListener('submit', async e => {
            e.preventDefault();
            const account = sanitizeInput(document.getElementById('loginAccount').value);
            const pass = document.getElementById('loginPassword').value;
            if (!account || !pass) { showToast('请填写账号和密码', 'warning'); return; }
            if (!validatePassword(pass)) { showToast('密码格式不正确', 'warning'); return; }

            const btn = e.target.querySelector('button[type="submit"]');
            if (btn) { btn.disabled = true; btn.textContent = '登录中...'; }

            try {
                const hashedPass = await hashPasswordClient(pass);
                const res = await apiPost('/auth/login', { account, password: hashedPass });
                if (res.code === 0) {
                    currentUser = res.data.user;
                    localStorage.setItem('rhodesUser', JSON.stringify(currentUser));
                    // 保存 JWT token（后续请求可通过 Authorization 头发送）
                    if (res.data.token) {
                        localStorage.setItem('rhodesToken', res.data.token);
                    }
                    // 登录后从服务器加载购物车和心愿单
                    const cartRes = await apiGet(`/cart/${currentUser.id}`);
                    if (cartRes.code === 0) { cart = cartRes.data; updateCartUI(); }
                    const wlRes = await apiGet(`/wishlist/${currentUser.id}`);
                    if (wlRes.code === 0) { wishlist = wlRes.data; updateWishlistUI(); }
                    const ordersRes = await apiGet(`/orders/${currentUser.id}`);
                    if (ordersRes.code === 0) { orders = ordersRes.data; }
                    updateUserUI();
                    closeLogin();
                    showToast(`登录成功！欢迎回来，${currentUser.name} 博士。`, 'success');
                } else {
                    showToast(res.message || '登录失败', 'error');
                }
            } catch(err) {
                // 后端不可达：降级本地登录
                currentUser = { id: 'local_' + Date.now(), name: account.includes('@') ? account.split('@')[0] : account, email: account.includes('@') ? account : account + '@rhodes.island' };
                localStorage.setItem('rhodesUser', JSON.stringify(currentUser));
                updateUserUI();
                closeLogin();
                showToast(`登录成功（本地模式）！欢迎回来，${currentUser.name} 博士。`, 'success');
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = '登录'; }
            }
        });

        // 注册表单 — 调用后端 API
        document.getElementById('registerForm').addEventListener('submit', async e => {
            e.preventDefault();
            const name = sanitizeInput(document.getElementById('regName').value);
            const email = sanitizeInput(document.getElementById('regEmail').value);
            const pass = document.getElementById('regPassword').value;
            if (!name || !email || !pass) { showToast('请填写完整信息', 'warning'); return; }
            if (!validateName(name)) { showToast('昵称需2-20位中英文或数字', 'warning'); return; }
            if (!validateEmail(email)) { showToast('邮箱格式不正确', 'warning'); return; }
            if (!validatePassword(pass)) { showToast('密码需6-128位', 'warning'); return; }

            const btn = e.target.querySelector('button[type="submit"]');
            if (btn) { btn.disabled = true; btn.textContent = '注册中...'; }

            try {
                const hashedPass = await hashPasswordClient(pass);
                const res = await apiPost('/auth/register', { name, email, password: hashedPass });
                if (res.code === 0) {
                    currentUser = res.data.user;
                    localStorage.setItem('rhodesUser', JSON.stringify(currentUser));
                    if (res.data.token) {
                        localStorage.setItem('rhodesToken', res.data.token);
                    }
                    updateUserUI();
                    closeLogin();
                    showToast(`注册成功！欢迎加入，${name} 博士！`, 'success');
                } else {
                    showToast(res.message || '注册失败', 'error');
                }
            } catch(err) {
                // 降级本地注册
                currentUser = { id: 'local_' + Date.now(), name, email };
                localStorage.setItem('rhodesUser', JSON.stringify(currentUser));
                updateUserUI();
                closeLogin();
                showToast(`注册成功（本地模式）！欢迎加入，${name} 博士！`, 'success');
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = '立即加入'; }
            }
        });

        // 商品弹窗遮罩
        document.getElementById('productOverlay').addEventListener('click', closeProductDetail);

        // 分类筛选
        document.getElementById('categoryFilters').addEventListener('click', e => {
            const btn = e.target.closest('.filter-tag');
            if (btn) filterProducts(btn.dataset.filter);
        });

        // 导航链接
        document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                filterProducts(link.dataset.category);
                document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
            });
        });

        // 移动菜单
        document.getElementById('mobileMenuBtn').addEventListener('click', () => {
            document.getElementById('mobileMenuBtn').classList.toggle('active');
            document.getElementById('mobileMenu').classList.toggle('active');
        });

        // 排序选择器
        document.getElementById('sortSelect').addEventListener('change', () => {
            renderProducts(currentFilter);
        });

        // 对比遮罩关闭
        document.getElementById('compareOverlay').addEventListener('click', closeCompareModal);

        // ESC 关闭所有弹窗
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                closeSearch(); closeCart(); closeWishlist(); closeLogin();
                closeProductDetail(); closeOrderModal(); closeSuccessModal(); closeUserCenter();
                closeCompareModal();
            }
        });
    }

    // ==================== 滚动动画 ====================
    function setupScrollAnimations() {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add('visible');
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.feature-item').forEach(el => observer.observe(el));

        // 品牌故事里程碑渐现
        const brandObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.brand-milestone').forEach(el => brandObserver.observe(el));

        // 评价卡片渐现
        const reviewObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

        document.querySelectorAll('.review-card').forEach(el => reviewObserver.observe(el));

        // 回到顶部按钮
        const backBtn = document.getElementById('backToTop');
        window.addEventListener('scroll', () => {
            backBtn.classList.toggle('visible', window.scrollY > 400);
        });
    }

    // ==================== 客服系统 ====================
    const csChatHistory = []; // 聊天历史
    let csIsTyping = false;
    let csHasUnread = false;
    let csSatisfactionRated = false;

    // 智能客服知识库
    const csKnowledgeBase = {
        default: '博士，您的问题我已经记录下来了。让我为您查一下相关信息...',
        greeting: [
            '您好，博士！我是凯尔希医生，罗德岛客服负责人。有什么可以帮您的？',
            '欢迎回来，博士。需要查询订单还是了解新品信息？',
        ],
        order: [
            '您的订单通常在下单后1-3个工作日内发货。龙门、维多利亚等主要城市24小时内送达，偏远地区3-5个工作日。您可以点击右上角头像进入"用户中心"查看订单状态。',
            '发货后系统会自动更新物流信息，您可以在用户中心随时追踪包裹。如果有紧急需求，我可以帮您加急处理。',
        ],
        refund: [
            '罗德岛支持7天无理由退换货，30天质保。如需退换，请在用户中心找到对应订单，点击"申请售后"。我们的物流部门会在48小时内上门取件。',
            '退换货流程很简单：1) 用户中心→订单详情→申请售后；2) 填写原因；3) 物流上门取件；4) 退款在收到退货后3-5个工作日原路返回。',
        ],
        coupon: [
            '目前有多个优惠活动正在进行：① 全场满299减50（优惠码：RHODES50）；② 满199减30（优惠码：TACTICAL30）；③ 新用户首次下单享88折（优惠码：NEW88）；④ 免运费券（优惠码：FREESHIP）。您可以在领券中心领取。',
            '对了博士，首页优惠券区域可以直接点击领取。建议先领取再下单，能省不少龙门币呢！',
        ],
        payment: [
            '我们支持龙门币、源石、至纯源石以及泰拉大陆主流银行转账。支付过程采用罗德岛工程部研发的多重加密技术，保障您的交易安全。',
            '结算时系统会自动计算优惠，您还可以使用优惠码进一步抵扣。支付成功后订单立即进入备货流程。',
        ],
        human: [
            '正在为您转接人工客服... 请稍候。预计等待时间约2分钟。\n\n【提示】当前为自动回复模式。如需真正的人工服务，请拨打罗德岛客服热线：400-ROD-ISLAND，工作时间：泰拉历每日 09:00-21:00。',
            '我理解您需要更详细的帮助。让我为您记录工单，人工客服会在24小时内通过邮件回复您。请确保您的注册邮箱有效。',
        ],
        product: [
            '关于商品详情，您可以在商品页面查看具体参数。每件商品都经过罗德岛工程部严格质检，并有详细的材质、尺寸说明。如果对某件商品感兴趣，可以点击商品图片查看详情页。',
            '目前热销商品包括：莱茵生命急救包、罗德岛战术背包、阿米娅指挥官套装等。您可以用顶部的搜索功能快速找到想要的商品。',
        ],
        satisfaction: '感谢您的评价，博士！如有其他问题随时找我。罗德岛始终为您服务。',
    };

    // 关键词匹配规则
    const csKeywordRules = [
        { keys: ['你好', '您好', 'hi', 'hello', '嗨', '在吗', '在么'], category: 'greeting' },
        { keys: ['订单', '发货', '物流', '快递', '配送', '什么时候', '多久', '到货', '运输'], category: 'order' },
        { keys: ['退换', '退货', '退款', '换货', '售后', '质量', '坏了', '破损', '退钱'], category: 'refund' },
        { keys: ['优惠', '折扣', '活动', '券', '便宜', '省钱', '促销', '满减', '打折'], category: 'coupon' },
        { keys: ['支付', '付款', '龙门币', '源石', '怎么买', '结账', '买单', '付钱'], category: 'payment' },
        { keys: ['人工', '客服', '转接', '真人', '电话', '联系'], category: 'human' },
        { keys: ['商品', '产品', '介绍', '推荐', '详情', '参数', '规格', '材质', '好用', '怎么样'], category: 'product' },
    ];

    function csMatchCategory(message) {
        const lower = message.toLowerCase();
        for (const rule of csKeywordRules) {
            if (rule.keys.some(k => lower.includes(k))) {
                return rule.category;
            }
        }
        return 'default';
    }

    function csGetReply(category) {
        const replies = csKnowledgeBase[category];
        if (!replies) return csKnowledgeBase.default;
        if (Array.isArray(replies)) {
            return replies[Math.floor(Math.random() * replies.length)];
        }
        return replies;
    }

    // 打开/关闭客服窗口
    function toggleChatWindow() {
        const win = document.getElementById('csChatWindow');
        const fab = document.getElementById('csFab');
        const isOpening = !win.classList.contains('active');

        if (isOpening) {
            win.classList.add('active');
            csHasUnread = false;
            fab.classList.remove('has-unread');
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
                document.getElementById('csChatInput').focus();
                csScrollToBottom();
            }, 350);
        } else {
            win.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    function closeChatWindow() {
        const win = document.getElementById('csChatWindow');
        win.classList.remove('active');
        document.body.style.overflow = '';
    }

    // 滚动到底部
    function csScrollToBottom() {
        const body = document.getElementById('csChatBody');
        setTimeout(() => {
            body.scrollTop = body.scrollHeight;
        }, 100);
    }

    // 隐藏欢迎界面
    function csHideEmptyChat() {
        const empty = document.getElementById('csEmptyChat');
        if (empty) empty.style.display = 'none';
    }

    // 显示正在输入
    function csShowTyping() {
        csIsTyping = true;
        document.getElementById('csTyping').classList.add('active');
        csScrollToBottom();
    }

    // 隐藏正在输入
    function csHideTyping() {
        csIsTyping = false;
        document.getElementById('csTyping').classList.remove('active');
    }

    // 添加消息到聊天区
    function csAddMessage(type, content, time) {
        csHideEmptyChat();
        const body = document.getElementById('csChatBody');
        const now = time || new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const isAgent = type === 'agent';

        const msgDiv = document.createElement('div');
        msgDiv.className = `cs-message ${type}`;
        msgDiv.innerHTML = `
            <div class="cs-message-avatar">${isAgent ? 'K' : (currentUser ? currentUser.name.charAt(0).toUpperCase() : '博')}</div>
            <div>
                <div class="cs-message-bubble">${escapeHtml(content).replace(/\n/g, '<br>')}</div>
                <div class="cs-message-time">${now}</div>
            </div>
        `;

        // 插入到typing indicator之前
        const typing = document.getElementById('csTyping');
        body.insertBefore(msgDiv, typing);

        csChatHistory.push({ type, content, time: now });
        csScrollToBottom();
    }

    // 发送消息
    function sendMessage() {
        const input = document.getElementById('csChatInput');
        const message = input.value.trim();
        if (!message || csIsTyping) return;

        // 添加用户消息
        csAddMessage('user', message);
        input.value = '';
        csSatisfactionRated = false;

        // 显示正在输入
        csShowTyping();

        // 模拟AI回复延迟
        const category = csMatchCategory(message);
        const reply = csGetReply(category);
        const delay = 800 + Math.random() * 1500;

        setTimeout(() => {
            csHideTyping();
            csAddMessage('agent', reply);

            // 如果是窗口关闭状态，显示未读标记
            const win = document.getElementById('csChatWindow');
            if (!win.classList.contains('active')) {
                csHasUnread = true;
                document.getElementById('csFab').classList.add('has-unread');
            }

            // 随机追加满意度调查
            if (Math.random() < 0.3 && !csSatisfactionRated) {
                csAddSatisfactionPrompt();
            }
        }, delay);
    }

    // 快捷问题
    function sendQuickQuestion(question) {
        document.getElementById('csChatInput').value = question;
        sendMessage();
    }

    // 满意度调查
    function csAddSatisfactionPrompt() {
        csSatisfactionRated = true;
        const body = document.getElementById('csChatBody');
        const typing = document.getElementById('csTyping');

        const satisfactionDiv = document.createElement('div');
        satisfactionDiv.className = 'cs-message agent';
        satisfactionDiv.innerHTML = `
            <div class="cs-message-avatar">K</div>
            <div>
                <div class="cs-message-bubble">
                    本次服务是否解决了您的问题？
                    <div class="cs-satisfaction" style="margin-top:10px;">
                        <button class="cs-satisfaction-btn good" onclick="csRateSatisfaction(this, 'good')">&#128077;</button>
                        <button class="cs-satisfaction-btn bad" onclick="csRateSatisfaction(this, 'bad')">&#128078;</button>
                    </div>
                </div>
            </div>
        `;
        body.insertBefore(satisfactionDiv, typing);
        csScrollToBottom();
    }

    function csRateSatisfaction(btn, type) {
        const allBtns = btn.parentElement.querySelectorAll('.cs-satisfaction-btn');
        allBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        if (type === 'good') {
            csAddMessage('agent', csKnowledgeBase.satisfaction);
        } else {
            csAddMessage('agent', '非常抱歉给您带来不便，博士。我会将您的问题记录并反馈给相关部门改进。如需进一步帮助，可以转接人工客服。');
        }

        // 禁用所有按钮
        setTimeout(() => {
            allBtns.forEach(b => { b.disabled = true; b.style.pointerEvents = 'none'; });
        }, 100);
    }

    // 清空聊天历史
    function clearChatHistory() {
        if (!confirm('确定要清空聊天记录吗？')) return;

        const body = document.getElementById('csChatBody');
        const typing = document.getElementById('csTyping');
        const empty = document.getElementById('csEmptyChat');

        // 清除所有消息（保留typing和empty）
        const messages = body.querySelectorAll('.cs-message, .cs-typing-indicator ~ *:not(.cs-typing-indicator)');
        body.querySelectorAll('.cs-message').forEach(m => m.remove());

        // 移除satisfaction（在typing之前的额外元素）
        while (body.firstChild !== empty && body.firstChild !== typing) {
            if (body.firstChild && body.firstChild !== typing) {
                body.firstChild.remove();
            } else break;
        }

        // 重新添加typing
        if (!body.contains(typing)) {
            body.appendChild(typing);
        }

        csChatHistory.length = 0;
        csSatisfactionRated = false;
        empty.style.display = 'flex';
        showToast('聊天记录已清空', 'info');
    }

    // 初始化客服系统事件
    function setupCustomerService() {
        const fab = document.getElementById('csFab');
        const closeBtn = document.getElementById('csCloseBtn');
        const input = document.getElementById('csChatInput');
        const sendBtn = document.getElementById('csSendBtn');
        const overlay = document.getElementById('csChatWindow');

        // 浮动按钮点击
        fab.addEventListener('click', toggleChatWindow);

        // 关闭按钮
        closeBtn.addEventListener('click', closeChatWindow);

        // 回车发送
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // 发送按钮
        sendBtn.addEventListener('click', sendMessage);

        // ESC 关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const win = document.getElementById('csChatWindow');
                if (win.classList.contains('active')) {
                    closeChatWindow();
                }
            }
        });
    }

    // 在初始化时注册客服系统
    // （由 setupEventListeners 调用后自动附加）

    // ==================== Hero 轮播 ====================
    let heroCurrent = 0;
    const HERO_TOTAL = 3;
    let heroTimer = null;
    const HERO_INTERVAL = 5000;

    function initHeroCarousel() {
        const carousel = document.getElementById('heroCarousel');
        if (!carousel) return;

        const slider = document.getElementById('heroSlider');
        const dots = document.querySelectorAll('#heroDots .hero-dot');
        const prevBtn = document.getElementById('heroPrev');
        const nextBtn = document.getElementById('heroNext');

        function goTo(index) {
            if (index < 0) index = HERO_TOTAL - 1;
            if (index >= HERO_TOTAL) index = 0;
            heroCurrent = index;

            // 滑动
            slider.style.transform = `translateX(-${heroCurrent * 100}%)`;

            // 更新 active class
            document.querySelectorAll('.hero-slide').forEach((s, i) => {
                s.classList.toggle('active', i === heroCurrent);
            });

            // 更新导航点
            dots.forEach((d, i) => {
                d.classList.toggle('active', i === heroCurrent);
            });
        }

        function next() { goTo(heroCurrent + 1); }
        function prev() { goTo(heroCurrent - 1); }

        function startTimer() {
            stopTimer();
            heroTimer = setInterval(next, HERO_INTERVAL);
        }

        function stopTimer() {
            if (heroTimer) { clearInterval(heroTimer); heroTimer = null; }
        }

        // 箭头按钮
        if (prevBtn) prevBtn.addEventListener('click', () => { prev(); startTimer(); });
        if (nextBtn) nextBtn.addEventListener('click', () => { next(); startTimer(); });

        // 导航点点击
        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                goTo(parseInt(dot.dataset.index));
                startTimer();
            });
        });

        // 触摸滑动支持
        let touchStartX = 0;
        let touchEndX = 0;
        carousel.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            stopTimer();
        }, { passive: true });
        carousel.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                diff > 0 ? next() : prev();
            }
            startTimer();
        });

        // 鼠标悬停暂停
        carousel.addEventListener('mouseenter', stopTimer);
        carousel.addEventListener('mouseleave', startTimer);

        // 键盘导航
        document.addEventListener('keydown', (e) => {
            const carouselRect = carousel.getBoundingClientRect();
            const inView = carouselRect.top < window.innerHeight && carouselRect.bottom > 0;
            if (!inView) return;
            if (e.key === 'ArrowLeft') { prev(); startTimer(); }
            if (e.key === 'ArrowRight') { next(); startTimer(); }
        });

        // 启动
        startTimer();
    }
