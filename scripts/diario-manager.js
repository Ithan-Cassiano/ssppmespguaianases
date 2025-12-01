class DiarioManager {
    constructor() {
        this.init();
    }
    init() {
    }
    getAllPosts() {
        const posts = JSON.parse(localStorage.getItem('diarioPosts') || '[]');
        return posts.sort((a, b) => new Date(b.dataPublicacao) - new Date(a.dataPublicacao));
    }
    getPostById(id) {
        const posts = this.getAllPosts();
        return posts.find(p => p.id === parseInt(id));
    }
    addPost(postData) {
        const posts = this.getAllPosts();
        const newId = posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1;
        const newPost = {
            id: newId,
            titulo: postData.titulo,
            conteudo: postData.conteudo,
            dataPublicacao: postData.dataPublicacao || new Date().toISOString(),
            edicao: postData.edicao || '',
            caderno: postData.caderno || 'Executivo',
            secao: postData.secao || 'Atos de Pessoal',
            createdAt: new Date().toISOString()
        };
        posts.push(newPost);
        localStorage.setItem('diarioPosts', JSON.stringify(posts));
        return { success: true, post: newPost };
    }
    updatePost(id, postData) {
        const posts = this.getAllPosts();
        const index = posts.findIndex(p => p.id === parseInt(id));
        if (index === -1) {
            return { success: false, message: 'Postagem não encontrada' };
        }
        posts[index] = {
            ...posts[index],
            titulo: postData.titulo,
            conteudo: postData.conteudo,
            dataPublicacao: postData.dataPublicacao || posts[index].dataPublicacao,
            edicao: postData.edicao || posts[index].edicao,
            caderno: postData.caderno || posts[index].caderno,
            secao: postData.secao || posts[index].secao,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('diarioPosts', JSON.stringify(posts));
        return { success: true, post: posts[index] };
    }
    deletePost(id) {
        const posts = this.getAllPosts();
        const filteredPosts = posts.filter(p => p.id !== parseInt(id));
        localStorage.setItem('diarioPosts', JSON.stringify(filteredPosts));
        return { success: true };
    }
}
const diarioManager = new DiarioManager();
