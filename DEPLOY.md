# 汽车维修资源库 - 完整版部署指南

## 📦 项目内容

```
auto-repair-hub/
├── public/                 # 前端网站文件
│   ├── index.html         # 主页面（21KB）
│   └── app.js             # 前端逻辑（19KB）
├── workers/               # Cloudflare Worker 后端
│   └── index.js           # API 服务（12KB）
├── wrangler.toml          # Worker 配置
├── package.json           # 项目配置
├── README.md              # 说明文档
└── DEPLOY.md              # 部署指南
```

## 🚀 快速部署流程

### 第1步：推送到 GitHub

```bash
# 在项目根目录执行
cd auto-repair-hub

# 初始化 git
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: 汽车维修资源库 v1.0"

# 连接到你的 GitHub 仓库（先创建好空仓库）
git remote add origin https://github.com/你的用户名/auto-repair-hub.git

# 推送
git push -u origin main
```

### 第2步：部署前端到 Cloudflare Pages

1. 登录 https://dash.cloudflare.com
2. 左侧菜单 → **Pages** → **Create a project**
3. 选择 **Connect to Git**
4. 选择你的 GitHub 仓库 `auto-repair-hub`
5. 构建设置：
   - **Project name**: auto-repair-hub
   - **Production branch**: main
   - **Framework preset**: None
   - **Build command**: 留空
   - **Build output directory**: `public`
6. 点击 **Save and Deploy**
7. 等待 30 秒，获取网站地址

### 第3步：部署 Worker 后端

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare
npx wrangler login

# 创建 KV 命名空间（只需一次）
npx wrangler kv:namespace create "AUTO_REPAIR_KV"

# 复制输出的 ID，更新 wrangler.toml 中的 id 字段

# 部署 Worker
npx wrangler deploy

# 获取 Worker URL（如 https://auto-repair-hub-api.你的用户名.workers.dev）
```

### 第4步：连接前后端

1. 复制 Worker URL（如 `https://auto-repair-hub-api.xxx.workers.dev`）
2. 编辑 `public/app.js`，找到 `CONFIG.API_BASE`，改为：
   ```javascript
   API_BASE: 'https://auto-repair-hub-api.xxx.workers.dev'
   ```
3. 提交并推送更新：
   ```bash
   git add public/app.js
   git commit -m "Update API endpoint"
   git push
   ```
4. Cloudflare Pages 会自动重新部署

## ✅ 功能验证清单

部署完成后，验证以下功能：

### 前端功能
- [ ] 搜索框能输入关键词
- [ ] 分类列表可展开/收起
- [ ] 点击品牌显示对应资源
- [ ] 资源卡片有预览/收藏/访问按钮
- [ ] 点击预览弹出模态框
- [ ] 点击收藏心形图标变色
- [ ] 收藏面板能打开并显示列表
- [ ] 响应式布局（手机/电脑都正常）

### 后端功能
- [ ] 收藏数据能跨设备同步
- [ ] 刷新页面后收藏还在
- [ ] 搜索历史被记录
- [ ] 热门搜索有数据

## 🔧 自定义配置

### 添加更多资源

编辑 `public/app.js` 中的 `RESOURCES_DB` 数组，添加：

```javascript
{
    id: '唯一标识',
    title: '资源标题',
    brand: '品牌代码（vw/audi/bmw等）',
    model: '车型名称',
    category: 'manual/circuit/video/doc',
    type: '显示类型',
    source: '来源网站',
    url: '跳转链接',
    previewUrl: '预览链接',
    size: '文件大小',
    pages: 页数,
    year: '年份',
    thumbnail: '缩略图URL',
    description: '描述'
}
```

### 绑定自定义域名

1. 在 Cloudflare Pages 项目 → **Custom domains**
2. 点击 **Set up a custom domain**
3. 输入你的域名
4. 按提示配置 DNS
5. 自动获得 SSL 证书

### 修改 Worker API 地址

如果更换了 Worker URL，需要在 `app.js` 中更新：

```javascript
const CONFIG = {
    API_BASE: 'https://你的新worker地址',
    // ...
};
```

## 📊 包含资源统计

| 品牌 | 维修手册 | 电路图 | 视频教程 | 合计 |
|------|---------|--------|----------|------|
| 大众 | 5 | 2 | 0 | 7 |
| 奥迪 | 3 | 2 | 0 | 5 |
| 宝马 | 3 | 2 | 0 | 5 |
| 奔驰 | 3 | 2 | 0 | 5 |
| 保时捷 | 1 | 1 | 0 | 2 |
| 丰田 | 5 | 1 | 0 | 6 |
| 本田 | 5 | 1 | 0 | 6 |
| 日产 | 5 | 1 | 0 | 6 |
| 马自达 | 1 | 1 | 0 | 2 |
| 斯巴鲁 | 1 | 0 | 0 | 1 |
| 福特 | 4 | 1 | 0 | 5 |
| 雪佛兰 | 1 | 0 | 0 | 1 |
| 别克 | 0 | 0 | 0 | 0 |
| 凯迪拉克 | 0 | 0 | 0 | 0 |
| 吉普 | 0 | 0 | 0 | 0 |
| 现代 | 0 | 0 | 0 | 0 |
| 起亚 | 0 | 0 | 0 | 0 |
| 比亚迪 | 0 | 0 | 0 | 0 |
| 吉利 | 0 | 0 | 0 | 0 |
| 长安 | 0 | 0 | 0 | 0 |
| 哈弗 | 0 | 0 | 0 | 0 |
| 五菱 | 0 | 0 | 0 | 0 |
| 标致 | 0 | 0 | 0 | 0 |
| 雪铁龙 | 0 | 0 | 0 | 0 |
| 通用教程 | 1 | 0 | 2 | 3 |
| **总计** | **38** | **14** | **2** | **54** |

## 🌐 已集成的资源网站

- **畅易汽车** (ephauto.com) - 原厂维修手册
- **汽修宝典** (qixiubaodian.com) - 电路图资料
- **汽车维修技术网** (qcwxjs.com) - 技术文档
- **B站** (bilibili.com) - 视频教程
- **知乎** (zhihu.com) - 问答资料

## 🐛 故障排除

### 页面空白或报错
```
解决：检查浏览器控制台，确认 app.js 路径正确
```

### 搜索无结果
```
正常：演示数据有限，可按上面说明添加更多资源
```

### 收藏无法保存
```
原因1：Worker 未部署或 API_BASE 配置错误
原因2：KV 命名空间未正确绑定
解决：检查 wrangler.toml 中的 kv_namespaces 配置
```

### 跨域错误 (CORS)
```
解决：确认 Worker 已正确部署，且 API_BASE 指向正确的 Worker URL
```

## 📞 技术支持

如有问题，检查以下链接：
- Cloudflare Pages 文档：https://developers.cloudflare.com/pages/
- Cloudflare Workers 文档：https://developers.cloudflare.com/workers/
- Wrangler CLI 文档：https://developers.cloudflare.com/workers/wrangler/

## 📄 许可证

MIT License - 可自由使用、修改、分发
