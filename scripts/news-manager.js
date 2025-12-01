class NewsManager {
    constructor() {
        this.init();
    }
    init() {
    }
    getAllNews() {
        const news = JSON.parse(localStorage.getItem('news') || '[]');
        return news.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    getNewsById(id) {
        const news = this.getAllNews();
        return news.find(n => n.id === parseInt(id));
    }
    addNews(newsData) {
        const news = this.getAllNews();
        const newId = news.length > 0 ? Math.max(...news.map(n => n.id)) + 1 : 1;
        const newNews = {
            id: newId,
            title: newsData.title,
            description: newsData.description,
            image: newsData.image,
            date: newsData.date,
            createdAt: new Date().toISOString()
        };
        news.push(newNews);
        localStorage.setItem('news', JSON.stringify(news));
        return { success: true, news: newNews };
    }
    updateNews(id, newsData) {
        const news = this.getAllNews();
        const index = news.findIndex(n => n.id === parseInt(id));
        if (index === -1) {
            return { success: false, message: 'Notícia não encontrada' };
        }
        news[index] = {
            ...news[index],
            title: newsData.title,
            description: newsData.description,
            image: newsData.image,
            date: newsData.date,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('news', JSON.stringify(news));
        return { success: true, news: news[index] };
    }
    deleteNews(id) {
        const news = this.getAllNews();
        const filteredNews = news.filter(n => n.id !== parseInt(id));
        localStorage.setItem('news', JSON.stringify(filteredNews));
        return { success: true };
    }
    renderNews(containerId, limit = 6) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const news = this.getAllNews().slice(0, limit);
        container.innerHTML = news.map(newsItem => `
            <div class="news-card">
                <div class="news-image">
                    <img src="${newsItem.image}" alt="${newsItem.title}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http:
                </div>
                <div class="news-content">
                    <h3>${newsItem.title}</h3>
                    <p>${newsItem.description}</p>
                    <span class="news-date">${newsItem.date}</span>
                </div>
            </div>
        `).join('');
    }
}
const newsManager = new NewsManager();
