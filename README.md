# EGP Cotação - Frontend

Frontend do Sistema de Cotação para a EGP Indústria e Comércio de Equipamentos Eletrônicos.

## Tecnologias

- **React 19** com TypeScript
- **Vite** como build tool
- **Tailwind CSS 4** para estilização
- **Wouter** para roteamento
- **Axios** para requisições HTTP
- **shadcn/ui** para componentes de UI

## Instalação

### Pré-requisitos

- Node.js 18+
- pnpm

### Passos

1. Clone o repositório e navegue até a pasta do frontend:
```bash
cd egp-frontend
```

2. Instale as dependências:
```bash
pnpm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com a URL do backend
```

## Desenvolvimento

Para iniciar o servidor de desenvolvimento:
```bash
pnpm dev
```

O aplicativo estará disponível em `http://localhost:5173`

## Build

Para criar um build de produção:
```bash
pnpm build
```

Para visualizar o build:
```bash
pnpm preview
```

## Estrutura do Projeto

```
src/
  ├── pages/           # Páginas da aplicação
  │   ├── Home.tsx
  │   ├── SupplierLogin.tsx
  │   ├── SupplierQuotation.tsx
  │   └── AdminDashboard.tsx
  ├── components/      # Componentes reutilizáveis
  ├── lib/             # Utilitários e helpers
  ├── App.tsx          # Componente raiz
  └── main.tsx         # Arquivo de entrada

public/               # Arquivos estáticos
```

## Páginas

### Home (`/`)
Página inicial com links para:
- Login de fornecedor
- Painel de administrador
- Instruções de uso

### Supplier Login (`/supplier/login`)
Formulário de login para fornecedores com:
- Campo de CNPJ
- Campo de senha temporária
- Validação de formulário

### Supplier Quotation (`/supplier/quotations`)
Formulário de cotação com:
- Tabela de itens a serem cotados
- Campos para preço em Real ou Dólar
- Campos opcionais para IPI e ICMS
- Cálculo automático de preço final
- Botão para salvar cotação

### Admin Dashboard (`/admin/dashboard`)
Painel administrativo com:
- Lista de cotações ativas
- Criação de novas cotações
- Resumo de preços com comparativo
- Coloração por status (verde/branco/vermelho)
- Definição de target de compra

## Variáveis de Ambiente

- `VITE_API_URL` - URL base do backend (padrão: http://localhost:3001)

## Autenticação

O frontend gerencia dois tipos de autenticação:

1. **Fornecedor**: Autenticação via CNPJ + senha temporária
   - Token JWT armazenado em sessionStorage
   - Válido por 14 dias

2. **Administrador**: Autenticação via OAuth Manus
   - Gerenciada automaticamente pelo framework

## Comunicação com Backend

O frontend se comunica com o backend via requisições HTTP usando Axios:

```typescript
// Exemplo de requisição
const response = await axios.post('/api/supplier/login', {
  cnpj: '00.000.000/0000-00',
  password: 'senha_temporaria'
});
```

## Estilos

O projeto usa Tailwind CSS 4 com:
- Tema de cores baseado na identidade visual EGP (rosa/magenta + preto)
- Componentes shadcn/ui para consistência
- Design responsivo para mobile e desktop

## Contribuindo

Para contribuir com o projeto, por favor:
1. Crie uma branch para sua feature
2. Faça commit das suas mudanças
3. Envie um pull request

## Licença

MIT
