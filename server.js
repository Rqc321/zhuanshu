const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
const PORT = 3000;

// 中间件配置
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// 简单的用户认证
const adminUser = {
    username: 'author',
    password: 'password123' // 实际使用时应使用加密密码
};

// 小说数据存储
const novels = [
    {
        id: 1,
        title: '御兽都市',
        status: '连载中',
        wordCount: 125432,
        chapters: [
            { id: 1, title: '第1章 神秘徽章', content: '...' },
            { id: 2, title: '第2章 觉醒仪式', content: '...' },
            { id: 3, title: '第3章 初次契约', content: '清晨的阳光透过窗户洒在房间里，林辰从床上爬起来，伸手摸向床头柜上的龙形徽章。这枚徽章是父母失踪前留给他的唯一物品，最近几天总是在深夜发出微弱的光芒。\n\n今天是觉醒仪式的日子，所有年满16岁的高中生都将在学校的御兽师协会分会进行觉醒，测试精神力天赋并尝试契约第一只御兽。林辰穿上校服，将徽章小心地挂在脖子上，对着镜子露出自信的笑容。' }
        ]
    },
    {
        id: 2,
        title: '秘境探险',
        status: '存稿中',
        wordCount: 45789,
        chapters: []
    },
    {
        id: 3,
        title: '御兽大赛',
        status: '构思中',
        wordCount: 12345,
        chapters: []
    }
];

// 登录路由
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === adminUser.username && password === adminUser.password) {
        req.session.isAuthenticated = true;
        req.session.user = { username };
        return res.json({ success: true, message: '登录成功' });
    } else {
        return res.json({ success: false, message: '用户名或密码错误' });
    }
});

// 登出路由
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: '登出成功' });
});

// 检查登录状态
app.get('/api/check-auth', (req, res) => {
    res.json({ isAuthenticated: req.session.isAuthenticated || false });
});

// 获取小说列表
app.get('/api/novels', (req, res) => {
    res.json(novels);
});

// 获取小说详情
app.get('/api/novels/:id', (req, res) => {
    const novelId = parseInt(req.params.id);
    const novel = novels.find(n => n.id === novelId);
    
    if (novel) {
        res.json(novel);
    } else {
        res.status(404).json({ error: '小说不存在' });
    }
});

// 获取章节内容
app.get('/api/novels/:novelId/chapters/:chapterId', (req, res) => {
    const novelId = parseInt(req.params.novelId);
    const chapterId = parseInt(req.params.chapterId);
    
    const novel = novels.find(n => n.id === novelId);
    if (!novel) {
        return res.status(404).json({ error: '小说不存在' });
    }
    
    const chapter = novel.chapters.find(c => c.id === chapterId);
    if (chapter) {
        res.json(chapter);
    } else {
        res.status(404).json({ error: '章节不存在' });
    }
});

// 保存章节（需要认证）
app.post('/api/novels/:novelId/chapters/:chapterId', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ error: '需要登录才能编辑' });
    }
    
    const novelId = parseInt(req.params.novelId);
    const chapterId = parseInt(req.params.chapterId);
    const { title, content } = req.body;
    
    const novel = novels.find(n => n.id === novelId);
    if (!novel) {
        return res.status(404).json({ error: '小说不存在' });
    }
    
    const chapter = novel.chapters.find(c => c.id === chapterId);
    if (chapter) {
        chapter.title = title;
        chapter.content = content;
        // 更新字数统计
        novel.wordCount = novel.chapters.reduce((total, ch) => total + ch.content.length, 0);
        res.json({ success: true, message: '章节更新成功' });
    } else {
        res.status(404).json({ error: '章节不存在' });
    }
});

// 创建新章节（需要认证）
app.post('/api/novels/:novelId/chapters', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ error: '需要登录才能创建章节' });
    }
    
    const novelId = parseInt(req.params.novelId);
    const { title, content } = req.body;
    
    const novel = novels.find(n => n.id === novelId);
    if (!novel) {
        return res.status(404).json({ error: '小说不存在' });
    }
    
    const newChapterId = novel.chapters.length > 0 ? Math.max(...novel.chapters.map(c => c.id)) + 1 : 1;
    const newChapter = {
        id: newChapterId,
        title,
        content
    };
    
    novel.chapters.push(newChapter);
    novel.wordCount += content.length;
    
    res.json({ success: true, message: '章节创建成功', chapter: newChapter });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log('小说创作网站已启动！');
    console.log('只有作者可以编辑内容，其他用户只能阅读。');
});