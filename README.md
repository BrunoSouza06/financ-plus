# FinanC+

Aplicação web de **controle financeiro pessoal**. Permite organizar contas, categorias e transações, acompanhar o saldo e entender para onde o dinheiro está indo, tudo em um dashboard simples e responsivo.

Projeto desenvolvido como parte do meu portfólio Full Stack.

## Funcionalidades

- **Login seguro**, com dados separados por usuário
- **Contas**: conta corrente, poupança, dinheiro, cartão e investimentos, com saldo sempre atualizado
- **Categorias** de receitas e despesas
- **Transações** com filtros por período, conta, categoria e tipo
- **Exportação para CSV**, pronta para abrir no Excel
- **Dashboard** com resumo do mês, gastos por categoria e evolução dos últimos 6 meses
- **Metas** com barra de progresso e destaque ao serem atingidas
- **Lançamentos recorrentes**, como aluguel e assinaturas, criados automaticamente
- **Layout responsivo**, com menu inferior no celular

## Tecnologias

- **Frontend:** React, TypeScript, Vite, Tailwind CSS e Recharts
- **Backend:** Node.js, Express, TypeScript, Prisma e Zod
- **Banco de dados e autenticação:** Supabase (PostgreSQL)
- **Testes:** Vitest

## Estrutura do projeto

```
financ-plus/
├── api/   # API REST
└── web/   # Aplicação React
```

## Como executar

1. Crie um projeto no [Supabase](https://supabase.com) e preencha os arquivos `.env` de cada pasta, seguindo os modelos `.env.example`.
2. Na pasta `api`, rode `npm install` e `npm run dev`.
3. Na pasta `web`, rode `npm install` e `npm run dev`.
4. Acesse `http://localhost:5173`.
