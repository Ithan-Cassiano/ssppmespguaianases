class UserManagement {
    constructor() {
        this.init();
    }
    init() {
    }
    getAllUsers() {
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        return Object.values(users).map(user => ({
            username: user.username,
            email: user.email,
            role: user.role || 'user',
            createdAt: user.createdAt || 'N/A'
        }));
    }
    changeUserRole(username, newRole) {
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        if (!users[username]) {
            return { success: false, message: 'Usuário não encontrado' };
        }
        const currentUser = auth.getCurrentUser();
        if (currentUser && currentUser.username === username) {
            return { success: false, message: 'Você não pode alterar seu próprio nível de acesso' };
        }
        
        const validRoles = ['admin', 'governador', 'comandante', 'p5', 'policial', 'user'];
        if (!validRoles.includes(newRole)) {
            return { success: false, message: 'Cargo inválido' };
        }
        
        if (currentUser && currentUser.role === 'comandante') {
            if (newRole !== 'policial' && newRole !== 'user') {
                return { success: false, message: 'Comandante só pode alterar para Policial ou Usuário' };
            }
            if (users[username].role === 'admin' || users[username].role === 'governador' || users[username].role === 'comandante' || users[username].role === 'p5') {
                return { success: false, message: 'Comandante não pode alterar cargos administrativos' };
            }
        }
        
        users[username].role = newRole;
        localStorage.setItem('users', JSON.stringify(users));
        let roleName = 'Usuário';
        if (newRole === 'admin') roleName = 'Administrador';
        else if (newRole === 'governador') roleName = 'Governador';
        else if (newRole === 'comandante') roleName = 'Comandante';
        else if (newRole === 'p5') roleName = 'P5';
        else if (newRole === 'policial') roleName = 'Policial';
        return { success: true, message: `Permissão de ${username} alterada para ${roleName}` };
    }
    deleteUser(username) {
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        if (!users[username]) {
            return { success: false, message: 'Usuário não encontrado' };
        }
        const currentUser = auth.getCurrentUser();
        if (currentUser && currentUser.username === username) {
            return { success: false, message: 'Você não pode deletar sua própria conta' };
        }
        const admins = Object.values(users).filter(u => u.role === 'admin');
        if (users[username].role === 'admin' && admins.length === 1) {
            return { success: false, message: 'Não é possível deletar o último administrador' };
        }
        delete users[username];
        localStorage.setItem('users', JSON.stringify(users));
        return { success: true, message: 'Usuário deletado com sucesso' };
    }
    resetUserPassword(username, newPassword) {
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        if (!users[username]) {
            return { success: false, message: 'Usuário não encontrado' };
        }
        users[username].password = newPassword;
        localStorage.setItem('users', JSON.stringify(users));
        return { success: true, message: 'Senha resetada com sucesso' };
    }
}
const userManagement = new UserManagement();
