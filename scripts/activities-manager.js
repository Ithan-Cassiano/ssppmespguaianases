class ActivitiesManager {
    constructor() {
        this.init();
    }
    init() {
    }
    getActivitiesByType(type) {
        const activities = JSON.parse(localStorage.getItem('activities') || '[]');
        return activities
            .filter(a => a.type === type)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    getAllActivities() {
        const activities = JSON.parse(localStorage.getItem('activities') || '[]');
        return activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    getActivityById(id) {
        const activities = this.getAllActivities();
        return activities.find(a => a.id === parseInt(id));
    }
    addActivity(activityData) {
        const activities = this.getAllActivities();
        const newId = activities.length > 0 ? Math.max(...activities.map(a => a.id)) + 1 : 1;
        const newActivity = {
            id: newId,
            type: activityData.type, 
            title: activityData.title,
            description: activityData.description || null,
            date: activityData.date || null,
            image: activityData.image || null,
            createdAt: new Date().toISOString()
        };
        activities.push(newActivity);
        localStorage.setItem('activities', JSON.stringify(activities));
        return { success: true, activity: newActivity };
    }
    updateActivity(id, activityData) {
        const activities = this.getAllActivities();
        const index = activities.findIndex(a => a.id === parseInt(id));
        if (index === -1) {
            return { success: false, message: 'Atividade não encontrada' };
        }
        activities[index] = {
            ...activities[index],
            type: activityData.type,
            title: activityData.title,
            description: activityData.description || null,
            date: activityData.date || null,
            image: activityData.image || null,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('activities', JSON.stringify(activities));
        return { success: true, activity: activities[index] };
    }
    deleteActivity(id) {
        const activities = this.getAllActivities();
        const filteredActivities = activities.filter(a => a.id !== parseInt(id));
        localStorage.setItem('activities', JSON.stringify(filteredActivities));
        return { success: true };
    }
    renderActivities(containerId, type, limit = 3) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const activities = this.getActivitiesByType(type).slice(0, limit);
        if (activities.length === 0) {
            return;
        }
        container.innerHTML = activities.map(activity => {
            const iconClass = type === 'cultural' ? 'fa-theater-masks' : type === 'community' ? 'fa-users' : 'fa-graduation-cap';
            const showDetails = type === 'education' || activity.description || activity.date;
            return `
                <article class="activity-item ${showDetails ? 'activity-item-detailed' : ''}">
                    <div class="activity-image">
                        ${activity.image ? 
                            `<img src="${activity.image}" alt="${activity.title}" onerror="this.parentElement.innerHTML='<div class=\\'activity-placeholder\\'><i class=\\'fas ${iconClass}\\'></i></div>'">` :
                            `<div class="activity-placeholder">
                                <i class="fas ${iconClass}"></i>
                            </div>`
                        }
                    </div>
                    <div class="activity-content">
                        <h3>${activity.title}</h3>
                        ${activity.description ? `<p>${activity.description}</p>` : ''}
                        ${activity.date ? `<span class="activity-date">${activity.date}</span>` : ''}
                    </div>
                </article>
            `;
        }).join('');
    }
}
const activitiesManager = new ActivitiesManager();
