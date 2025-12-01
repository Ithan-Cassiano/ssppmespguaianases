class AuthSystem {
    constructor() {
        this.init();
    }
    init() {
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        if (!users['admin']) {
            users['admin'] = {
                username: 'admin',
                password: 'r0@t',
                email: 'admin@pmesp.gov.br',
                role: 'admin',
                createdAt: new Date().toISOString()
            };
        } else {
            users['admin'].role = 'admin';
            if (!users['admin'].password || users['admin'].password !== 'r0@t') {
                users['admin'].password = 'r0@t';
            }
        }
        localStorage.setItem('users', JSON.stringify(users));
        this.checkAuth();
    }
    checkAuth() {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            const user = JSON.parse(currentUser);
            const users = JSON.parse(localStorage.getItem('users') || '{}');
            if (users[user.username] && users[user.username].role) {
                user.role = users[user.username].role;
                localStorage.setItem('currentUser', JSON.stringify(user));
            }
            this.updateUI(user);
        }
    }
    login(username, password) {
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        if (users[username] && users[username].password === password) {
            if (username === 'admin') {
                users[username].role = 'admin';
                localStorage.setItem('users', JSON.stringify(users));
            }
            const user = {
                username: users[username].username,
                email: users[username].email,
                role: users[username].role || 'user'
            };
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.updateUI(user);
            return { success: true, user };
        }
        return { success: false, message: 'Usuário ou senha incorretos' };
    }
    logout() {
        localStorage.removeItem('currentUser');
        this.updateUI(null);
        window.location.href = 'index.html';
    }
    register(username, password, email) {
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        if (users[username]) {
            return { success: false, message: 'Usuário já existe' };
        }
        const existingUser = Object.values(users).find(u => u.email === email);
        if (existingUser) {
            return { success: false, message: 'E-mail já está em uso' };
        }
        users[username] = {
            username,
            password,
            email,
            role: 'user',
            createdAt: new Date().toISOString()
        };
        localStorage.setItem('users', JSON.stringify(users));
        return { 
            success: true, 
            message: 'Usuário criado com sucesso!'
        };
    }
    changePassword(username, oldPassword, newPassword) {
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        if (!users[username] || users[username].password !== oldPassword) {
            return { success: false, message: 'Senha atual incorreta' };
        }
        users[username].password = newPassword;
        localStorage.setItem('users', JSON.stringify(users));
        return { success: true, message: 'Senha alterada com sucesso' };
    }
    getCurrentUser() {
        const currentUser = localStorage.getItem('currentUser');
        return currentUser ? JSON.parse(currentUser) : null;
    }
    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    }
    isGovernador() {
        const user = this.getCurrentUser();
        return user && user.role === 'governador';
    }
    isComandante() {
        const user = this.getCurrentUser();
        return user && user.role === 'comandante';
    }
    isP5() {
        const user = this.getCurrentUser();
        return user && user.role === 'p5';
    }
    isPolicial() {
        const user = this.getCurrentUser();
        return user && user.role === 'policial';
    }
    hasPermission(panel) {
        const user = this.getCurrentUser();
        if (!user) return false;
        const role = user.role;
        if (role === 'admin') return true;
        if (panel === 'users') {
            return role === 'admin' || role === 'comandante';
        }
        if (panel === 'banner') {
            return role === 'admin';
        }
        if (role === 'governador') {
            return panel !== 'banner' && panel !== 'users';
        }
        if (role === 'comandante') {
            return panel === 'news' || panel === 'activities' || panel === 'concursos' || panel === 'users' || panel === 'numbers';
        }
        if (role === 'p5') {
            return panel === 'news' || panel === 'activities' || panel === 'numbers';
        }
        return false;
    }
    createUser(username, password, email, role = 'user') {
        if (!this.isAdmin()) {
            return { success: false, message: 'Apenas administradores podem criar usuários' };
        }
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        if (users[username]) {
            return { success: false, message: 'Usuário já existe' };
        }
        const existingUser = Object.values(users).find(u => u.email === email);
        if (existingUser) {
            return { success: false, message: 'E-mail já está em uso' };
        }
        const validRoles = ['admin', 'governador', 'comandante', 'p5', 'policial', 'user'];
        if (!validRoles.includes(role)) {
            return { success: false, message: 'Cargo inválido' };
        }
        users[username] = {
            username,
            password,
            email,
            role: role,
            createdAt: new Date().toISOString()
        };
        localStorage.setItem('users', JSON.stringify(users));
        return { success: true, message: 'Usuário criado com sucesso' };
    }
    changeUserPassword(username, newPassword) {
        if (!this.isAdmin()) {
            return { success: false, message: 'Apenas administradores podem alterar senhas' };
        }
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        if (!users[username]) {
            return { success: false, message: 'Usuário não encontrado' };
        }
        if (newPassword.length < 6) {
            return { success: false, message: 'A senha deve ter no mínimo 6 caracteres' };
        }
        users[username].password = newPassword;
        localStorage.setItem('users', JSON.stringify(users));
        return { success: true, message: 'Senha alterada com sucesso' };
    }
    updateUI(user) {
        const headerLoginBtn = document.getElementById('header-login-btn');
        const headerRegisterBtn = document.getElementById('header-register-btn');
        const headerUserMenu = document.getElementById('header-user-menu');
        const headerAdminLink = document.getElementById('header-admin-link');
        const userNameHeader = document.querySelector('.user-name-header');
        if (user) {
            if (headerLoginBtn) headerLoginBtn.style.display = 'none';
            if (headerRegisterBtn) headerRegisterBtn.style.display = 'none';
            if (headerUserMenu) {
                headerUserMenu.style.display = 'flex';
                if (userNameHeader) userNameHeader.textContent = user.username;
            }
            if (headerAdminLink) {
                const hasAdminAccess = user.role === 'admin' || 
                                     user.role === 'governador' || 
                                     user.role === 'comandante' || 
                                     user.role === 'p5';
                if (hasAdminAccess) {
                    headerAdminLink.style.display = 'flex';
                } else {
                    headerAdminLink.style.display = 'none';
                }
            }
        } else {
            if (headerLoginBtn) headerLoginBtn.style.display = 'flex';
            if (headerRegisterBtn) headerRegisterBtn.style.display = 'flex';
            if (headerUserMenu) headerUserMenu.style.display = 'none';
        }
    }
}
const auth = new AuthSystem();
