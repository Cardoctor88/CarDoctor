# 汽车维修资源库

全网汽车维修手册、电路图搜索与收藏平台

## 功能特性

- 🔍 **全网搜索** - 搜索各大平台维修资料
- 📚 **分类浏览** - 按品牌/车型分类查看
- ❤️ **收藏功能** - 收藏常用资源（本地存储）
- 👁️ **预览功能** - 快速预览资源内容
- 📱 **响应式设计** - 支持手机/平板/电脑

## 已集成资源平台

- 畅易汽车维修平台 (ephauto.com)
- 汽修宝典 (qixiubaodian.com)
- 汽车维修技术网 (qcwxjs.com)
- B站汽车维修视频
- 知乎汽车话题

## 快速部署到 Cloudflare Pages

### 方式1：直接上传（最简单）

1. 登录 https://dash.cloudflare.com
2. 进入 **Pages** → **Create a project**
3. 选择 **Upload assets**
4. 将 `public` 文件夹压缩为 ZIP，上传
5. 部署完成！

### 方式2：连接 GitHub（推荐）

1. 将代码推送到 GitHub 仓库
2. 在 Cloudflare Pages 选择 **Connect to Git**
3. 选择你的仓库，点击 **Begin setup**
4. 构建设置：
   - Framework preset: **None**
   - Build command: 留空
   - Build output directory: `public`
5. 点击 **Save and Deploy**

### 方式3：Wrangler CLI

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare
npx wrangler login

# 部署
npx wrangler pages deploy public --project-name=auto-repair-hub
```

## 目录结构

```
auto-repair-hub/
├── public/           # 静态网站文件
│   ├── index.html    # 主页面
│   └── app.js        # 前端逻辑
├── package.json      # 项目配置
└── README.md         # 说明文档
```

## 自定义配置

### 添加更多资源

编辑 `public/app.js` 中的 `RESOURCES_DB` 数组：

```javascript
{
    id: 'unique-id',
    title: '资源标题',
    brand: '品牌代码',
    model: '车型',
    category: 'manual/circuit/video',
    type: '显示类型',
    url: '跳转链接',
    previewUrl: '预览链接',
    thumbnail: '缩略图URL',
    description: '描述'
}
```

### 绑定自定义域名

1. 在 Cloudflare Pages 项目页面 → **Custom domains**
2. 点击 **Set up a custom domain**
3. 输入你的域名，按提示配置 DNS
4. 自动获得 SSL 证书

## 数据来源说明

本网站不存储任何文件，仅提供：
- 资源链接聚合
- 搜索引擎跳转
- 第三方网站预览

所有资源版权归原网站所有。

## 后续优化建议

1. **添加 Cloudflare Worker** - 实现服务端搜索API
2. **接入数据库** - 使用 Cloudflare D1 存储资源数据
3. **用户系统** - 使用 Cloudflare Access 或自建登录
4. **缓存优化** - 配置 Cloudflare Cache Rules

## 许可证

MIT License
