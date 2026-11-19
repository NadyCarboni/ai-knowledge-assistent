# AI Knowledge Assistant

Protótipo de um assistente de leitura que recomenda livros usando a API Gemini. A rota de conversa transmite a resposta em streaming (SSE) e mantém um histórico temporário por sessão.

## Requisitos

- Node.js 22 ou superior.
- Uma chave da Gemini API.
- Git Bash no Windows (é o terminal usado nos exemplos abaixo).

## Configuração inicial

Abra o Git Bash na pasta do projeto, onde está o `package.json`, e instale as dependências:

```bash
npm install
```

Crie um arquivo chamado `.env` na raiz do projeto e adicione sua chave:

```env
GEMINI_API_KEY=sua_chave_da_gemini
GEMINI_MODEL=gemini-3.8-flash
```

`GEMINI_MODEL` é opcional; se não for definido, o código usa `gemini-3.8-flash`. Não compartilhe nem faça commit do `.env`: ele contém credenciais e já está listado no `.gitignore`.

## Iniciar o servidor

No Git Bash, ainda na raiz do projeto, rode:

```bash
npx tsx src/index.ts
```

O `tsx` executa o TypeScript diretamente, sem precisar compilar antes. Quando aparecer uma mensagem como `Server running on http://localhost:3001`, o servidor está ativo. Mantenha esse terminal aberto. Para parar, pressione `Ctrl+C`.

Use um segundo terminal para fazer requisições enquanto o servidor estiver rodando.

## Conferir se o servidor está ativo

```bash
curl -i http://localhost:3001/health
```

A resposta esperada é `200 OK` com:

```json
{"status":"ok"}
```

## Conversar com o assistente

Envie um `POST` para `/chat`. O endpoint exige `message` e `sessionId`:

```bash
curl -N -i -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"teste-1","message":"Recomende três livros de suspense"}'
```

O `-N` faz o `curl` mostrar os pedaços assim que chegam. Como a resposta usa SSE, você verá eventos começando com `data:`. Reutilize o mesmo `sessionId` para continuar uma conversa; use outro para iniciar uma sessão separada.

As sessões ficam apenas na memória do processo. Ao parar ou reiniciar o servidor, o histórico é perdido.

## Limite de tokens e histórico

O código mantém o histórico abaixo de `MAX_INPUT_TOKENS`, atualmente configurado como `8_000`. Quando o contexto passa desse valor, as trocas mais antigas são removidas até que caiba ou reste apenas a mensagem atual. Se a mensagem atual sozinha exceder o limite, a rota responde `413 Content too large`.

O terminal mostra `Context tokens` com a contagem do histórico após os cortes. Essa contagem não inclui a instrução de sistema (`SYSTEM_INSTRUCTION`), pois o modo Gemini Developer API usado pelo projeto não permite passá-la ao método `countTokens`.

## Problemas comuns

- **`npx` não é reconhecido:** abra o Git Bash configurado com Node/NVM e confira `node --version` e `npm --version`.
- **Porta 3001 em uso:** pare o servidor anterior com `Ctrl+C` ou encerre o processo que está usando essa porta.
- **Resposta `502`:** veja o terminal do servidor; ele mostra o erro detalhado da chamada ao Gemini.
- **Resposta `413`:** a mensagem atual excedeu o limite configurado em `MAX_INPUT_TOKENS` mesmo depois da remoção das trocas antigas.
