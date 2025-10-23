# SAC – Central de Perguntas & Respostas (Firebase)

Sistema simples de SAC (FAQ) com:
- Login/Registro via Firebase (Email & Senha)
- CRUD completo em Firestore
- Abas de categorias (geradas dinamicamente)
- Busca por pergunta/resposta
- Botão de *seed* para carregar a base inicial (usa exatamente os textos fornecidos)

## Como usar no navegador
1. Faça deploy em um host estático (ou abra `index.html` via algum servidor local para evitar restrições do módulo ES).
2. Abra no navegador, crie uma conta (Email/Senha) ou faça login.
3. Clique em **Carregar base (seed)** se a coleção `faqs` estiver vazia.
4. Edite/Exclua/Crie novas perguntas e respostas.

## App desktop (Electron)
Agora o projeto também pode ser executado como um aplicativo de desktop multiplataforma utilizando [Electron](https://www.electronjs.org/).

### Pré-requisitos
- Node.js 18+ (recomendado)
- NPM

### Instalação e execução em modo desenvolvimento
```bash
npm install
npm start
```
O comando `npm start` abre uma janela do Electron renderizando `index.html` diretamente no aplicativo.

### Gerar instaláveis/artefatos
Scripts prontos para empacotar o app com [`electron-packager`](https://github.com/electron/electron-packager):

```bash
# Windows (x64)
npm run package

# Linux (x64)
npm run package:linux

# macOS (Apple Silicon)
npm run package:mac
```

Os arquivos gerados ficarão na pasta `dist/`. Ajuste as flags do `electron-packager` conforme o alvo desejado (arquitetura, ícone etc.).

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
