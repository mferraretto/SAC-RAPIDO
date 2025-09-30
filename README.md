# SAC – Central de Perguntas & Respostas (Firebase)

Sistema simples de SAC (FAQ) com:
- Login/Registro via Firebase (Email & Senha)
- CRUD completo em Firestore
- Abas de categorias (geradas dinamicamente)
- Busca por pergunta/resposta
- Botão de *seed* para carregar a base inicial (usa exatamente os textos fornecidos)

## Como usar
1. Faça deploy em um host estático (ou abra `index.html` via algum servidor local para evitar restrições do módulo ES).
2. Abra no navegador, crie uma conta (Email/Senha) ou faça login.
3. Clique em **Carregar base (seed)** se a coleção `faqs` estiver vazia.
4. Edite/Exclua/Crie novas perguntas e respostas.

> **Atenção**: as respostas de *seed* foram copiadas **literalmente** do conteúdo fornecido. Não altere se deseja manter 100% a fidelidade.

## Estrutura Firestore
Coleção: `faqs`
```json
{ 
  "category": "Entrega & Prazo",
  "question": "MUDANÇA DE PRAZO",
  "answer": "… (texto) …",
  "createdBy": "uid",
  "createdAt": "ServerTimestamp",
  "updatedAt": "ServerTimestamp"
}
```

## Segurança
Este exemplo é client-side. Recomenda-se configurar regras do Firestore apropriadas (ver `firestore.rules`) para produção.
