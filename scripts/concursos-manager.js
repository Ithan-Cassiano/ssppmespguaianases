class ConcursosManager {
    constructor() {
        this.init();
    }
    init() {
    }
    getAllConcursos() {
        const concursos = JSON.parse(localStorage.getItem('concursos') || '[]');
        return concursos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    getConcursosByAccess(userRole) {
        const allConcursos = this.getAllConcursos();
        if (!userRole || userRole === 'user') {
            return allConcursos.filter(c => c.tipo === 'aberto');
        }
        if (userRole === 'policial' || userRole === 'admin') {
            return allConcursos;
        }
        return allConcursos.filter(c => c.tipo === 'aberto');
    }
    getConcursoById(id) {
        const concursos = this.getAllConcursos();
        return concursos.find(c => c.id === parseInt(id));
    }
    addConcurso(concursoData) {
        const concursos = this.getAllConcursos();
        const newId = concursos.length > 0 ? Math.max(...concursos.map(c => c.id)) + 1 : 1;
        const newConcurso = {
            id: newId,
            title: concursoData.title,
            description: concursoData.description || null,
            image: concursoData.image || null,
            linkProva: concursoData.linkProva || null,
            dataHoraProva: concursoData.dataHoraProva || null, 
            dataHoraFecharProva: concursoData.dataHoraFecharProva || null, 
            linkApostila: concursoData.linkApostila || null,
            dataPostagem: concursoData.dataPostagem || null,
            dataConcurso: concursoData.dataConcurso || null,
            tipo: concursoData.tipo || 'aberto', 
            createdAt: new Date().toISOString()
        };
        concursos.push(newConcurso);
        localStorage.setItem('concursos', JSON.stringify(concursos));
        return { success: true, concurso: newConcurso };
    }
    updateConcurso(id, concursoData) {
        const concursos = this.getAllConcursos();
        const index = concursos.findIndex(c => c.id === parseInt(id));
        if (index === -1) {
            return { success: false, message: 'Concurso não encontrado' };
        }
        concursos[index] = {
            ...concursos[index],
            title: concursoData.title,
            description: concursoData.description || null,
            image: concursoData.image || null,
            linkProva: concursoData.linkProva || null,
            dataHoraProva: concursoData.dataHoraProva || null, 
            dataHoraFecharProva: concursoData.dataHoraFecharProva || null, 
            linkApostila: concursoData.linkApostila || null,
            dataPostagem: concursoData.dataPostagem || null,
            dataConcurso: concursoData.dataConcurso || null,
            tipo: concursoData.tipo || 'aberto',
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('concursos', JSON.stringify(concursos));
        return { success: true, concurso: concursos[index] };
    }
    deleteConcurso(id) {
        const concursos = this.getAllConcursos();
        const filteredConcursos = concursos.filter(c => c.id !== parseInt(id));
        localStorage.setItem('concursos', JSON.stringify(filteredConcursos));
        return { success: true };
    }
}
const concursosManager = new ConcursosManager();
