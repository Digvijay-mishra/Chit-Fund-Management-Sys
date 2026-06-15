# BC / Chit Fund Management System

Full-stack starter system with React frontend, Node.js/Express backend and MongoDB.

## Features included

- JWT login/register
- Group CRUD with customizable ticket number format
- Member CRUD with search by name, phone, email, ticket number
- Joint membership tree support with same ticket number and individual due status
- Monthly cycle generation
- Winner selection API with commission and payout transactions
- Member payments, payouts, commission, penalty, income and expense transactions
- Automatic penalty calculation for late member payments
- Finance dashboard
- Message log/scheduler structure for SMS/WhatsApp/Email
- Reports summary and CSV export
- Daily cron due scan for pending/overdue installments, joint-party dues, penalties and scheduled reminders
- Group detail Add Member button and per-member Due column
- Oldest-created group sorting first

## Run backend

```bash
cd backend
cp .env.example .env
npm config set registry https://registry.npmjs.org/
npm install --no-audit --no-fund
npm run seed
npm run dev
```



## Run frontend

```bash
cd frontend
npm config set registry https://registry.npmjs.org/
npm install --no-audit --no-fund
npm run dev
```

search option and name se search kro and field add kro for personal and proffesiunal
