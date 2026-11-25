# 💰 FinanC+ — Controle Financeiro Pessoal

O **FinanC+** é um sistema de controle financeiro pessoal desenvolvido como projeto Full Stack, com o objetivo de facilitar o gerenciamento de contas e oferecer uma visão organizada da vida financeira do usuário.

O projeto também tem como propósito aprofundar conhecimentos em desenvolvimento Web, arquitetura de APIs, autenticação, bancos de dados e boas práticas de programação.

## 🚀 Tecnologias utilizadas

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

### Backend

- Node.js
- Express
- TypeScript
- Prisma ORM (v6)
- Zod

### Banco de dados e autenticação

- Supabase
- PostgreSQL
- Supabase Auth

## 🏗️ Arquitetura

O projeto utiliza uma arquitetura separada entre frontend e backend:

- **Frontend:** responsável pela interface e interação com o usuário.
- **Backend:** API REST desenvolvida com Node.js e Express.
- **Prisma:** gerenciamento da comunicação entre a API e o banco de dados.
- **Supabase:** armazenamento dos dados e gerenciamento da autenticação.

A autenticação utiliza o Supabase Auth, enquanto o backend realiza a validação dos tokens recebidos por meio de middleware próprio.

## ⚙️ Funcionalidades

- Autenticação e gerenciamento de usuários.
- Gerenciamento de contas financeiras (CRUD).
- Cálculo automático do saldo das contas.
- Validação de dados utilizando Zod.
- Integração com banco de dados PostgreSQL.
- API REST com rotas para gerenciamento dos recursos.

## 🔮 Funcionalidades futuras

- Controle de compras parceladas.
- Alertas e notificações.
- Tema escuro (Dark Mode).
- Documentação da API com Swagger.

## 🗄️ Banco de dados

O banco de dados utiliza PostgreSQL hospedado no Supabase, com gerenciamento de entidades através do Prisma ORM.

Tabelas principais:

- `accounts`
- `categories`
- `transactions`
- `goals`
- `recurring_transactions`

O saldo das contas é calculado dinamicamente durante a consulta, considerando as movimentações financeiras.

## 🔐 Segurança

- Autenticação gerenciada pelo Supabase Auth.
- Validação de tokens no backend.
- Validação de entradas utilizando Zod.
- Variáveis sensíveis armazenadas em arquivos de ambiente.
- Credenciais e chaves de acesso não devem ser versionadas no Git.
