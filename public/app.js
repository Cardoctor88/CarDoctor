/**
 * 汽车维修资源库 - 主应用逻辑（对接 Cloudflare Worker API）
 * 功能：搜索、分类浏览、收藏（云端同步）、预览
 */

// 配置
const CONFIG = {
    // Cloudflare Worker API 地址（已配置）
    API_BASE: 'https://auto-repair-hub-api.liu82ni.workers.dev',
    
    // 搜索源配置
    SEARCH_ENGINES: [
        { name: '百度', url: 'https://www.baidu.com/s?wd=' },
        { name: '必应', url: 'https://www.bing.com/search?q=' },
        { name: 'Google', url: 'https://www.google.com/search?q=' }
    ],
    
    // 默认资源数据（API 不可用时兜底）
    DEFAULT_RESOURCES: []
};

// 状态管理
const state = {
    currentCategory: 'all',
    currentFilter: 'all',
    favorites: [], // 从 API 获取，不再依赖 localStorage
    history: [],   // 从 API 获取，不再依赖 localStorage
    resources: [],
    isSearching: false,
    isApiAvailable: true // 标记 API 是否可用
};

// 汽车品牌分类数据（不变）
const CATEGORIES = [
    {
        id: 'german',
        name: '德系车',
        icon: 'fa-car',
        brands: [
            { id: 'vw', name: '大众', models: ['速腾', '迈腾', '帕萨特', '朗逸', '途观'] },
            { id: 'audi', name: '奥迪', models: ['A4L', 'A6L', 'Q5', 'Q3', 'A3'] },
            { id: 'bmw', name: '宝马', models: ['3系', '5系', 'X1', 'X3', 'X5'] },
            { id: 'benz', name: '奔驰', models: ['C级', 'E级', 'GLC', 'GLA', 'S级'] },
            { id: 'porsche', name: '保时捷', models: ['卡宴', '帕拉梅拉', '911', 'Macan'] }
        ]
    },
    {
        id: 'japanese',
        name: '日系车',
        icon: 'fa-car-side',
        brands: [
            { id: 'toyota', name: '丰田', models: ['卡罗拉', '凯美瑞', 'RAV4', '汉兰达', '雷凌'] },
            { id: 'honda', name: '本田', models: ['思域', '雅阁', 'CR-V', '飞度', '奥德赛'] },
            { id: 'nissan', name: '日产', models: ['轩逸', '天籁', '逍客', '奇骏', '楼兰'] },
            { id: 'mazda', name: '马自达', models: ['昂克赛拉', 'CX-5', '阿特兹', 'CX-4'] },
            { id: 'subaru', name: '斯巴鲁', models: ['森林人', '傲虎', 'XV', '力狮'] }
        ]
    },
    {
        id: 'american',
        name: '美系车',
        icon: 'fa-truck',
        brands: [
            { id: 'ford', name: '福特', models: ['福克斯', '蒙迪欧', '锐界', '探险者', 'F-150'] },
            { id: 'chevy', name: '雪佛兰', models: ['科鲁兹', '迈锐宝', '探界者', '科沃兹'] },
            { id: 'buick', name: '别克', models: ['英朗', '君威', '君越', '昂科威', 'GL8'] },
            { id: 'cadillac', name: '凯迪拉克', models: ['CT5', 'XT5', 'XT4', 'CT6'] },
            { id: 'jeep', name: '吉普', models: ['牧马人', '大切诺基', '指南者', '自由光'] }
        ]
    },
    {
        id: 'korean',
        name: '韩系车',
        icon: 'fa-taxi',
        brands: [
            { id: 'hyundai', name: '现代', models: ['伊兰特', '索纳塔', 'ix35', '途胜', '名图'] },
            { id: 'kia', name: '起亚', models: ['K3', 'K5', '智跑', '傲跑', '焕驰'] }
        ]
    },
    {
        id: 'chinese',
        name: '国产车',
        icon: 'fa-flag',
        brands: [
            { id: 'byd', name: '比亚迪', models: ['秦', '汉', '唐', '宋', '元'] },
            { id: 'geely', name: '吉利', models: ['帝豪', '博越', '星瑞', '缤越', '领克03'] },
            { id: 'changan', name: '长安', models: ['CS75', '逸动', 'UNI-T', 'CS55', '锐程'] },
            { id: 'haval', name: '哈弗', models: ['H6', 'H9', '大狗', '初恋', '赤兔'] },
            { id: 'wuling', name: '五菱', models: ['宏光', '宏光MINI', '凯捷', '星辰'] }
        ]
    },
    {
        id: 'french',
        name: '法系车',
        icon: 'fa-wine-bottle',
        brands: [
            { id: 'peugeot', name: '标致', models: ['408', '508', '4008', '5008', '2008'] },
            { id: 'citroen', name: '雪铁龙', models: ['C5', 'C4L', '天逸', '凡尔赛'] }
        ]
    }
];

// 资源数据库（本地兜底）
const RESOURCES_DB = [
    {
        id: 'vw-sagitar-manual',
        title: '大众速腾维修手册（2019-2024）',
        brand: 'vw',
        model: '速腾',
        category: 'manual',
        type: '维修手册',
        source: '原厂',
        url: 'https://www.ephauto.com/search.php?kw=大众速腾维修手册',
        previewUrl: 'https://www.ephauto.com/',
        downloadUrl: '',
        size: '156MB',
        pages: 2340,
        year: '2024',
        thumbnail: 'https://via.placeholder.com/300x200/2563eb/ffffff?text=速腾维修手册',
        description: '包含发动机、变速箱、电气系统完整维修流程'
    },
    {
        id: 'vw-magotan-circuit',
        title: '大众迈腾电路图完整版',
        brand: 'vw',
        model: '迈腾',
        category: 'circuit',
        type: '电路图',
        source: '原厂',
        url: 'https://www.qcwxjs.com/search.php?q=迈腾电路图',
        previewUrl: 'https://www.qcwxjs.com/',
        downloadUrl: '',
        size: '89MB',
        pages: 450,
        year: '2023',
        thumbnail: 'https://via.placeholder.com/300x200/059669/ffffff?text=迈腾电路图',
        description: '全车电路图，包含ECU、传感器、执行器连接图'
    }
];

// DOM 元素
const elements = {
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    searchFilters: document.querySelectorAll('.filter-tag'),
    categoryList: document.getElementById('categoryList'),
    resourceGrid: document.getElementById('resourceGrid'),
    searchResults: document.getElementById('searchResults'),
    contentTitle: document.getElementById('contentTitle'),
    loading: document.getElementById('loading'),
    previewModal: document.getElementById('previewModal'),
    previewFrame: document.getElementById('previewFrame'),
    modalTitle: document.getElementById('modalTitle'),
    modalClose: document.getElementById('modalClose'),
    favoritesBtn: document.getElementById('favoritesBtn'),
    favoritesPanel: document.getElementById('favoritesPanel'),
    favoritesList: document.getElementById('favoritesList'),
    closeFavorites: document.getElementById('closeFavorites'),
    favCount: document.getElementById('favCount'),
    toast: document.getElementById('toast'),
    viewBtns: document.querySelectorAll('.view-btn')
};

// ====================== API 调用函数（核心新增） ======================
// 获取收藏（从 Worker API）
async function getFavorites() {
    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/favorites`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) {
            state.favorites = data.data || [];
            updateFavCount();
            renderFavorites();
            return state.favorites;
        } else {
            throw new Error(data.error || '获取收藏失败');
        }
    } catch (error) {
        console.error('API 获取收藏失败，使用本地数据:', error);
        state.isApiAvailable = false;
        state.favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        return state.favorites;
    }
}

// 添加收藏（调用 Worker API）
async function addFavoriteToApi(resource) {
    if (!state.isApiAvailable) return false;
    
    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/favorites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: resource.id,
                title: resource.title,
                type: resource.type,
                thumbnail: resource.thumbnail,
                url: resource.url,
                description: resource.description
            })
        });
        const data = await res.json();
        return data.success;
    } catch (error) {
        console.error('API 添加收藏失败:', error);
        return false;
    }
}

// 移除收藏（调用 Worker API）
async function removeFavoriteFromApi(id) {
    if (!state.isApiAvailable) return false;
    
    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/favorites?id=${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        return data.success;
    } catch (error) {
        console.error('API 移除收藏失败:', error);
        return false;
    }
}

// 添加搜索历史（调用 Worker API）
async function addHistoryToApi(query) {
    if (!state.isApiAvailable) return;
    
    try {
        await fetch(`${CONFIG.API_BASE}/api/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
    } catch (error) {
        console.error('API 添加历史失败:', error);
    }
}

// ====================== 原有功能改造 ======================
// 初始化（优先加载 API 数据）
async function init() {
    renderCategories();
    renderResources();
    await getFavorites(); // 优先从 API 加载收藏
    updateFavCount();
    bindEvents();
}

// 渲染资源卡片（不变）
function renderResources(brandFilter = null) {
    let resources = RESOURCES_DB;
    
    if (brandFilter) {
        resources = resources.filter(r => r.brand === brandFilter);
    }
    
    if (state.currentFilter !== 'all') {
        resources = resources.filter(r => r.category === state.currentFilter);
    }
    
    elements.resourceGrid.innerHTML = resources.map(resource => `
        <div class="resource-card" data-id="${resource.id}">
            <div class="resource-preview">
                <img src="${resource.thumbnail}" alt="${resource.title}" loading="lazy">
                <span class="resource-type">${resource.type}</span>
            </div>
            <div class="resource-info">
                <div class="resource-title">${resource.title}</div>
                <div class="resource-meta">
                    <span><i class="fas fa-file"></i> ${resource.size}</span>
                    <span><i class="fas fa-calendar"></i> ${resource.year}</span>
                </div>
                <div class="resource-actions">
                    <button class="action-btn primary" onclick="previewResource('${resource.id}')">
                        <i class="fas fa-eye"></i> 预览
                    </button>
                    <button class="action-btn ${isFavorited(resource.id) ? 'favorited' : ''}" onclick="toggleFavorite('${resource.id}')">
                        <i class="fas ${isFavorited(resource.id) ? 'fa-heart' : 'fa-heart-o'}"></i>
                    </button>
                    <button class="action-btn" onclick="openResource('${resource.id}')">
                        <i class="fas fa-external-link-alt"></i> 访问
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// 搜索功能（改造：调用 API 记录历史）
async function performSearch(query) {
    if (!query.trim()) {
        showToast('请输入搜索内容');
        return;
    }
    
    state.isSearching = true;
    elements.loading.style.display = 'block';
    elements.resourceGrid.style.display = 'none';
    elements.searchResults.classList.add('active');
    elements.contentTitle.textContent = `搜索"${query}"的结果`;
    
    // 本地数据库搜索
    const localResults = RESOURCES_DB.filter(r => 
        r.title.includes(query) || 
        r.model.includes(query) ||
        r.description.includes(query)
    );
    
    // 模拟全网搜索结果
    const webResults = generateWebSearchResults(query);
    
    // 合并结果
    const allResults = [...localResults.map(r => ({
        title: r.title,
        url: r.url,
        desc: r.description,
        source: r.source,
        type: r.type,
        isLocal: true,
        id: r.id
    })), ...webResults];
    
    setTimeout(async () => {
        renderSearchResults(allResults);
        elements.loading.style.display = 'none';
        state.isSearching = false;
        // 调用 API 记录历史（新增）
        await addHistoryToApi(query);
        // 本地历史兜底
        addToLocalHistory(query);
    }, 1500);
}

// 生成全网搜索结果（不变）
function generateWebSearchResults(query) {
    const results = [];
    const searchSites = [
        { name: '畅易汽车维修平台', base: 'https://www.ephauto.com/search.php?kw=' },
        { name: '汽修宝典', base: 'https://www.qixiubaodian.com/search?keyword=' },
        { name: '汽车维修技术网', base: 'https://www.qcwxjs.com/search.php?q=' },
        { name: 'B站汽车维修', base: 'https://search.bilibili.com/all?keyword=' },
        { name: '知乎汽车话题', base: 'https://www.zhihu.com/search?type=content&q=' }
    ];
    
    searchSites.forEach(site => {
        results.push({
            title: `${query} - ${site.name}搜索结果`,
            url: `${site.base}${encodeURIComponent(query)}`,
            desc: `在${site.name}搜索"${query}"的相关维修资料、技术文档、视频教程`,
            source: site.name,
            type: '搜索结果',
            isLocal: false
        });
    });
    
    return results;
}

// 渲染搜索结果（不变）
function renderSearchResults(results) {
    if (results.length === 0) {
        elements.searchResults.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--gray);">
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p>未找到相关资源</p>
                <p style="font-size: 0.875rem; margin-top: 0.5rem;">试试其他关键词，如"发动机异响"、"变速箱故障"</p>
            </div>
        `;
        return;
    }
    
    elements.searchResults.innerHTML = results.map(result => `
        <div class="result-item">
            <div class="result-title" onclick="${result.isLocal ? `previewResource('${result.id}')` : `openExternalLink('${result.url}')`}">
                ${result.title}
            </div>
            <div class="result-url">
                <i class="fas fa-link"></i> ${result.url}
            </div>
            <div class="result-desc">${result.desc}</div>
            <div class="result-actions">
                <span class="result-action" onclick="openExternalLink('${result.url}')">
                    <i class="fas fa-external-link-alt"></i> 访问链接
                </span>
                ${result.isLocal ? `
                    <span class="result-action" onclick="previewResource('${result.id}')">
                        <i class="fas fa-eye"></i> 预览
                    </span>
                    <span class="result-action" onclick="toggleFavorite('${result.id}')">
                        <i class="fas ${isFavorited(result.id) ? 'fa-heart' : 'fa-heart-o'}"></i> ${isFavorited(result.id) ? '已收藏' : '收藏'}
                    </span>
                ` : `
                    <span class="result-action" onclick="copyLink('${result.url}')">
                        <i class="fas fa-copy"></i> 复制链接
                    </span>
                `}
            </div>
        </div>
    `).join('');
}

// 预览资源（改造：修复空白页）
function previewResource(id) {
    const resource = RESOURCES_DB.find(r => r.id === id);
    if (!resource) return;
    
    elements.modalTitle.textContent = resource.title;
    
    // 优先在模态框内预览，避免跳转空白页
    if (resource.previewUrl) {
        elements.previewFrame.src = resource.previewUrl;
        elements.previewModal.classList.add('active');
    } else {
        // 跳转前提示
        showToast('正在打开资源页面...');
        openExternalLink(resource.url);
    }
}

// 打开资源（改造：添加加载提示）
function openResource(id) {
    const resource = RESOURCES_DB.find(r => r.id === id);
    if (resource) {
        showToast('正在打开资源页面...');
        openExternalLink(resource.url);
    }
}

// 安全打开外部链接（新增：解决空白页）
function openExternalLink(url) {
    try {
        // 用新标签页打开，避免当前页面跳转
        const newTab = window.open(url, '_blank');
        if (!newTab) {
            // 弹窗被拦截时提示
            showToast('链接打开失败，请允许弹窗权限');
            copyLink(url); // 自动复制链接
        }
    } catch (error) {
        showToast('链接打开失败，已复制链接到剪贴板');
        copyLink(url);
    }
}

// 收藏功能（改造：对接 API）
async function toggleFavorite(id) {
    const resource = RESOURCES_DB.find(r => r.id === id);
    if (!resource) return;
    
    const index = state.favorites.findIndex(f => f.id === id);
    
    if (index > -1) {
        // 移除收藏
        const success = state.isApiAvailable ? await removeFavoriteFromApi(id) : true;
        if (success) {
            state.favorites.splice(index, 1);
            showToast('已取消收藏');
        } else {
            showToast('取消收藏失败，使用本地数据');
        }
    } else {
        // 添加收藏
        const success = state.isApiAvailable ? await addFavoriteToApi(resource) : true;
        if (success) {
            state.favorites.push({
                id: resource.id,
                title: resource.title,
                type: resource.type,
                thumbnail: resource.thumbnail,
                addedAt: new Date().toISOString()
            });
            showToast('已添加到收藏');
        } else {
            showToast('添加收藏失败，使用本地数据');
        }
    }
    
    // 本地兜底存储
    localStorage.setItem('favorites', JSON.stringify(state.favorites));
    updateFavCount();
    renderFavorites();
    renderResources();
}

// 辅助函数（不变/新增）
function isFavorited(id) {
    return state.favorites.some(f => f.id === id);
}

function updateFavCount() {
    const count = state.favorites.length;
    elements.favCount.textContent = count;
    elements.favCount.style.display = count > 0 ? 'block' : 'none';
}

function renderFavorites() {
    if (state.favorites.length === 0) {
        elements.favoritesList.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--gray);">
                <i class="fas fa-heart" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>暂无收藏</p>
                <p style="font-size: 0.875rem; margin-top: 0.5rem;">点击资源卡片上的心形图标添加收藏</p>
            </div>
        `;
        return;
    }
    
    elements.favoritesList.innerHTML = state.favorites.map(fav => `
        <div class="favorite-item" onclick="previewResource('${fav.id}')">
            <div class="favorite-thumb">
                <i class="fas fa-file-alt"></i>
            </div>
            <div class="favorite-info">
                <div class="favorite-title">${fav.title}</div>
                <div class="favorite-type">${fav.type}</div>
            </div>
            <div class="favorite-remove" onclick="event.stopPropagation(); toggleFavorite('${fav.id}')">
                <i class="fas fa-times"></i>
            </div>
        </div>
    `).join('');
}

// 本地历史（兜底）
function addToLocalHistory(query) {
    const history = JSON.parse(localStorage.getItem('history') || '[]');
    const item = { query, time: new Date().toISOString() };
    history.unshift(item);
    if (history.length > 20) history = history.slice(0, 20);
    localStorage.setItem('history', JSON.stringify(history));
}

function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

function copyLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        showToast('链接已复制');
    }).catch(() => {
        showToast('复制失败，请手动复制');
    });
}

// 事件绑定（不变）
function bindEvents() {
    // 搜索
    elements.searchBtn.addEventListener('click', () => {
        performSearch(elements.searchInput.value);
    });
    
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch(elements.searchInput.value);
        }
    });
    
    // 过滤器
    elements.searchFilters.forEach(filter => {
        filter.addEventListener('click', () => {
            elements.searchFilters.forEach(f => f.classList.remove('active'));
            filter.classList.add('active');
            state.currentFilter = filter.dataset.filter;
            
            if (!state.isSearching) {
                renderResources();
            }
        });
    });
    
    // 分类展开/收起
    elements.categoryList.addEventListener('click', (e) => {
        const header = e.target.closest('.category-header');
        if (header) {
            header.classList.toggle('expanded');
            const   常量   常量 subList = header.nextElementSibling;
            subList.classList.toggle('show');
        }
        
        const   常量 subItem = e.target.closest('.subcategory-item');
        if (subItem) {
            document.querySelectorAll('.subcategory-item').forEach(i => i.classList.remove('active'));
            subItem.classList.add('active');
            
            const   常量 brand = subItem.dataset.brand;
            elements.contentTitle.textContent = `${subItem.textContent} 相关资源`;
            elements.searchResults.classList.remove('active');
            elements.resourceGrid.style.display = 'grid';
            renderResources(brand);
        }
    });
    
    // 模态框
    elements.modalClose.addEventListener('click', () => {
        elements.previewModal.classList.remove('active');
        elements.previewFrame.src = '';
    });
    
    elements.previewModal.addEventListener('click', (e) => {
        if (e.target === elements.previewModal) {
            elements.previewModal.classList.remove('active');
            elements.previewFrame.src = '';
        }
    });
    
    // 收藏面板
    elements.favoritesBtn.addEventListener('click', () => {
        elements.favoritesPanel.classList.add('active');
    });
    
    elements.closeFavorites.addEventListener('click', () => {
        elements.favoritesPanel.classList.remove('active');
    });
    
    // 视图切换
    elements.viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// 启动应用（改为异步）
document.addEventListener('DOMContentLoaded', init);
