/**
 * Cloudflare Worker - 汽车维修资源库后端API
 * 提供：用户收藏、搜索记录、资源统计等功能
 */

// 允许跨域的头部
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// 处理 CORS 预检请求
function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

// 生成唯一ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 获取客户端IP作为用户标识（简化版）
function getUserId(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'anonymous';
  return 'user_' + btoa(ip).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16);
}

// 主处理函数
export default {
  async fetch(request, env, ctx) {
    // 处理 CORS
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const userId = getUserId(request);

    try {
      // 路由处理
      switch (path) {
        // 收藏相关 API
        case '/api/favorites':
          if (method === 'GET') {
            return await getFavorites(env, userId);
          } else if (method === 'POST') {
            return await addFavorite(request, env, userId);
          } else if (method === 'DELETE') {
            return await removeFavorite(request, env, userId);
          }
          break;

        // 搜索历史 API
        case '/api/history':
          if (method === 'GET') {
            return await getSearchHistory(env, userId);
          } else if (method === 'POST') {
            return await addSearchHistory(request, env, userId);
          } else if (method === 'DELETE') {
            return await clearSearchHistory(env, userId);
          }
          break;

        // 资源统计 API
        case '/api/stats':
          return await getStats(env);

        // 热门搜索 API
        case '/api/trending':
          return await getTrendingSearches(env);

        // 资源访问统计
        case '/api/resource/view':
          if (method === 'POST') {
            return await recordResourceView(request, env);
          }
          break;

        // 健康检查
        case '/api/health':
          return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
            headers: corsHeaders
          });

        // 默认 404
        default:
          return new Response(JSON.stringify({ error: 'Not Found' }), {
            status: 404,
            headers: corsHeaders
          });
      }

      // 方法不允许
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: corsHeaders
      });

    } catch (error) {
      console.error('API Error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message 
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};

// ========== 收藏功能 ==========

async function getFavorites(env, userId) {
  try {
    const key = `favorites:${userId}`;
    const data = await env.AUTO_REPAIR_KV.get(key);
    const favorites = data ? JSON.parse(data) : [];
    
    return new Response(JSON.stringify({
      success: true,
      data: favorites,
      count: favorites.length
    }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500, headers: corsHeaders });
  }
}

async function addFavorite(request, env, userId) {
  try {
    const body = await request.json();
    const { id, title, type, thumbnail, url, description } = body;
    
    if (!id || !title) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required fields' 
      }), { status: 400, headers: corsHeaders });
    }

    const key = `favorites:${userId}`;
    const data = await env.AUTO_REPAIR_KV.get(key);
    let favorites = data ? JSON.parse(data) : [];
    
    // 检查是否已存在
    if (favorites.some(f => f.id === id)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Already favorited',
        data: favorites
      }), { status: 409, headers: corsHeaders });
    }
    
    // 添加新收藏
    favorites.push({
      id,
      title,
      type,
      thumbnail,
      url,
      description,
      addedAt: new Date().toISOString()
    });
    
    await env.AUTO_REPAIR_KV.put(key, JSON.stringify(favorites));
    
    // 更新全局收藏统计
    await updateFavoriteCount(env, id, 1);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Added to favorites',
      data: favorites,
      count: favorites.length
    }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500, headers: corsHeaders });
  }
}

async function removeFavorite(request, env, userId) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing id parameter' 
      }), { status: 400, headers: corsHeaders });
    }

    const key = `favorites:${userId}`;
    const data = await env.AUTO_REPAIR_KV.get(key);
    let favorites = data ? JSON.parse(data) : [];
    
    const index = favorites.findIndex(f => f.id === id);
    if (index === -1) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Favorite not found' 
      }), { status: 404, headers: corsHeaders });
    }
    
    favorites.splice(index, 1);
    await env.AUTO_REPAIR_KV.put(key, JSON.stringify(favorites));
    
    // 更新全局收藏统计
    await updateFavoriteCount(env, id, -1);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Removed from favorites',
      data: favorites,
      count: favorites.length
    }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500, headers: corsHeaders });
  }
}

// ========== 搜索历史 ==========

async function getSearchHistory(env, userId) {
  try {
    const key = `history:${userId}`;
    const data = await env.AUTO_REPAIR_KV.get(key);
    const history = data ? JSON.parse(data) : [];
    
    return new Response(JSON.stringify({
      success: true,
      data: history.slice(0, 50), // 只返回最近50条
      count: history.length
    }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500, headers: corsHeaders });
  }
}

async function addSearchHistory(request, env, userId) {
  try {
    const body = await request.json();
    const { query } = body;
    
    if (!query || query.trim() === '') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Query is required' 
      }), { status: 400, headers: corsHeaders });
    }

    const key = `history:${userId}`;
    const data = await env.AUTO_REPAIR_KV.get(key);
    let history = data ? JSON.parse(data) : [];
    
    // 添加到开头
    history.unshift({
      query: query.trim(),
      timestamp: new Date().toISOString(),
      id: generateId()
    });
    
    // 去重，保留最近100条
    history = history.filter((item, index, self) => 
      index === self.findIndex(t => t.query === item.query)
    ).slice(0, 100);
    
    await env.AUTO_REPAIR_KV.put(key, JSON.stringify(history));
    
    // 更新全局热门搜索
    await updateTrendingSearches(env, query.trim());
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Search recorded',
      data: history.slice(0, 20)
    }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500, headers: corsHeaders });
  }
}

async function clearSearchHistory(env, userId) {
  try {
    const key = `history:${userId}`;
    await env.AUTO_REPAIR_KV.delete(key);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Search history cleared'
    }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500, headers: corsHeaders });
  }
}

// ========== 统计数据 ==========

async function getStats(env) {
  try {
    // 获取各种统计数据
    const totalViews = await env.AUTO_REPAIR_KV.get('stats:total_views') || '0';
    const totalSearches = await env.AUTO_REPAIR_KV.get('stats:total_searches') || '0';
    const totalFavorites = await env.AUTO_REPAIR_KV.get('stats:total_favorites') || '0';
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        totalViews: parseInt(totalViews),
        totalSearches: parseInt(totalSearches),
        totalFavorites: parseInt(totalFavorites),
        timestamp: new Date().toISOString()
      }
    }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500, headers: corsHeaders });
  }
}

async function getTrendingSearches(env) {
  try {
    const data = await env.AUTO_REPAIR_KV.get('trending:searches');
    const trending = data ? JSON.parse(data) : [];
    
    return new Response(JSON.stringify({
      success: true,
      data: trending.slice(0, 20)
    }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500, headers: corsHeaders });
  }
}

async function recordResourceView(request, env) {
  try {
    const body = await request.json();
    const { resourceId } = body;
    
    if (resourceId) {
      const key = `views:${resourceId}`;
      const current = await env.AUTO_REPAIR_KV.get(key) || '0';
      await env.AUTO_REPAIR_KV.put(key, (parseInt(current) + 1).toString());
    }
    
    // 更新总访问量
    const total = await env.AUTO_REPAIR_KV.get('stats:total_views') || '0';
    await env.AUTO_REPAIR_KV.put('stats:total_views', (parseInt(total) + 1).toString());
    
    return new Response(JSON.stringify({
      success: true
    }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500, headers: corsHeaders });
  }
}

// ========== 辅助函数 ==========

async function updateFavoriteCount(env, resourceId, delta) {
  try {
    const key = `favcount:${resourceId}`;
    const current = await env.AUTO_REPAIR_KV.get(key) || '0';
    const newCount = Math.max(0, parseInt(current) + delta);
    await env.AUTO_REPAIR_KV.put(key, newCount.toString());
    
    // 更新总收藏数
    const total = await env.AUTO_REPAIR_KV.get('stats:total_favorites') || '0';
    const newTotal = Math.max(0, parseInt(total) + delta);
    await env.AUTO_REPAIR_KV.put('stats:total_favorites', newTotal.toString());
  } catch (e) {
    console.error('Update favorite count error:', e);
  }
}

async function updateTrendingSearches(env, query) {
  try {
    const key = 'trending:searches';
    const data = await env.AUTO_REPAIR_KV.get(key);
    let trending = data ? JSON.parse(data) : [];
    
    const existing = trending.find(t => t.query === query);
    if (existing) {
      existing.count += 1;
      existing.lastSearch = new Date().toISOString();
    } else {
      trending.push({
        query,
        count: 1,
        firstSearch: new Date().toISOString(),
        lastSearch: new Date().toISOString()
      });
    }
    
    // 按热度排序，保留前100
    trending.sort((a, b) => b.count - a.count);
    trending = trending.slice(0, 100);
    
    await env.AUTO_REPAIR_KV.put(key, JSON.stringify(trending));
    
    // 更新总搜索数
    const total = await env.AUTO_REPAIR_KV.get('stats:total_searches') || '0';
    await env.AUTO_REPAIR_KV.put('stats:total_searches', (parseInt(total) + 1).toString());
  } catch (e) {
    console.error('Update trending searches error:', e);
  }
}
