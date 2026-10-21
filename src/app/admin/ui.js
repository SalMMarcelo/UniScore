"use client";
// Pequenos componentes visuais do painel administrativo.

const CORES_BOTAO = {
    azul: "bg-blue-600 hover:bg-blue-700 text-white",
    verde: "bg-green-600 hover:bg-green-700 text-white",
    amarelo: "bg-yellow-500 hover:bg-yellow-600 text-white",
    vermelho: "bg-red-600 hover:bg-red-700 text-white",
    cinza: "bg-gray-100 hover:bg-gray-200 text-gray-700",
    escuro: "bg-gray-800 hover:bg-gray-900 text-white"
};

export function Botao({ cor = "cinza", className = "", ...props }) {
    return (
        <button
            type="button"
            {...props}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${CORES_BOTAO[cor]} ${className}`}
        />
    );
}

const CORES_SELO = {
    verde: "bg-green-100 text-green-800",
    amarelo: "bg-yellow-100 text-yellow-800",
    vermelho: "bg-red-100 text-red-800",
    azul: "bg-blue-100 text-blue-800",
    cinza: "bg-gray-100 text-gray-700"
};

export function Selo({ cor = "cinza", children }) {
    return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${CORES_SELO[cor]}`}>
            {children}
        </span>
    );
}

export function Cartao({ className = "", children }) {
    return (
        <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-5 ${className}`}>
            {children}
        </div>
    );
}

export function Carregando({ texto = "Carregando..." }) {
    return (
        <div className="text-center py-10 text-gray-500" role="status">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
            <div>{texto}</div>
        </div>
    );
}

export function Erro({ children }) {
    if (!children) return null;
    return (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
            {children}
        </div>
    );
}

export function Vazio({ children }) {
    return (
        <div className="text-center py-10 text-gray-500 bg-white rounded-2xl border border-gray-200">
            {children}
        </div>
    );
}

// Grupo de filtros em "pílulas"
export function Filtros({ opcoes, valor, onChange, rotulo }) {
    return (
        <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label={rotulo}>
            {opcoes.map(o => (
                <button
                    key={o.valor}
                    type="button"
                    onClick={() => onChange(o.valor)}
                    aria-pressed={valor === o.valor}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                        valor === o.valor ? "bg-gray-800 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                    }`}
                >
                    {o.rotulo}
                </button>
            ))}
        </div>
    );
}

export function mensagemErro(err) {
    if (err?.code === "permission-denied") {
        return "Permissão negada pelas regras do Firestore. Confirme que você entrou com uma conta de moderador com e-mail verificado.";
    }
    if (err?.code === "failed-precondition") {
        return "Esta consulta precisa de um índice do Firestore. Publique firestore.indexes.json (firebase deploy --only firestore:indexes).";
    }
    return err?.message || "Erro inesperado.";
}
