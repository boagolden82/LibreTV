import path from 'path';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  port: process.env.PORT || 8080,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  timeout: parseInt(process.env.REQUEST_TIMEOUT || '5000'),
  maxRetries: parseInt(process.env.MAX_RETRIES || '2'),
  cacheMaxAge: process.env.CACHE_MAX_AGE || '1d',
  userAgent: process.env.USER_AGENT || 'Mozilla/5.0',
  debug: process.env.DEBUG === 'true'
};

function sha256Hash(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// 新增：读取用户列表
function loadUsers() {
  const filePath = path.join(__dirname, 'users.json');
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    const users = JSON.parse(raw);
    // 所有密码都哈希处理
    return users.map(u => ({
      username: u.username,
      passwordHash: sha256Hash(u.password)
    }));
  } catch (e) {
    console.error('users.json 格式错误', e);
    return [];
  }
}

app.get(['/', '/index.html', '/player.html'], async (req, res) => {
  try {
    let filePath = path.join(__dirname, req.path === '/player.html' ? 'player.html' : 'index.html');
    let content = fs.readFileSync(filePath, 'utf8');

    // 新增：注入所有用户名和哈希后的密码
    const users = loadUsers();
    // 前端注入为 window.__ENV__.USERS = [ { username, passwordHash }, ... ]
    content = content.replace(
      'window.__ENV__.USERS = [];',
      `window.__ENV__.USERS = ${JSON.stringify(users)};`
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(content);
  } catch (err) {
    res.status(500).send('页面加载失败');
  }
});

app.listen(config.port, () => {
  console.log(`服务器运行在 http://localhost:${config.port}`);
});
