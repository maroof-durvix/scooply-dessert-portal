# Scooply — How to Run

Ice-cream parlor website: **Angular 19** client · **ASP.NET Core 8** Web API · **SQL Server LocalDB**.
Team: **Sufyan** (Team Lead, Frontend/UI) · **Bilal** (Backend API) · **Sobhan** (Database, QA, Documentation).

## 1. Install once
| Tool | Version | Check |
|---|---|---|
| .NET SDK | 8.x | `dotnet --version` |
| Node.js | 20 or newer | `node --version` |
| SQL Server LocalDB | any (ships with Visual Studio / SQL Server Express) | `sqllocaldb info` |

## 2. Start the API (terminal 1)
```
cd "Source Code/Scooply.Api"
dotnet run
```
- Runs on **http://localhost:5080** (Swagger: http://localhost:5080/swagger).
- On first run it creates the `ScooplyDb` database on `(localdb)\MSSQLLocalDB` and seeds all data automatically.
- Optional: restore the ready-made database instead — see `Database/README.md` (`ScooplyDb.bak`).

## 3. Start the website (terminal 2)
```
cd "Source Code/scooply-client"
npm install
npm start
```
Open **http://localhost:4200**. (The first `npm install` downloads ~300 MB of packages; it is not included in this zip.)

## 4. Run the tests (optional)
```
cd "Source Code/Scooply.Tests"
dotnet test
```
Expected: 40 passed.

## 5. Sign in
| Role | Where | Username | Password |
|---|---|---|---|
| Admin | http://localhost:4200/admin/login | `admin` | `Admin@123` |
| Member | http://localhost:4200/account/login | `ali_khan` / `sara_ahmed` / `john_doe` | `Member@123` |

Test cards (any future expiry, CVV `123`): `4111 1111 1111 1111` succeeds · `4000 0000 0000 0002` is declined.

## Folder map
| Folder | Contents |
|---|---|
| `Source Code/scooply-client` | Angular website (pages, admin, design system) |
| `Source Code/Scooply.Api` | ASP.NET Core Web API, EF Core, images in `wwwroot` |
| `Source Code/Scooply.Tests` | xUnit tests |
| `Database` | `ScooplyDb.bak` backup, `schema.sql`, restore guide |
| `Documentation` | Complete project report (Word) |

## Troubleshooting
- **Website shows no data** → the API is not running, or not on port 5080 (see `src/environments/environment.ts`).
- **API cannot reach the database** → start LocalDB: `sqllocaldb start MSSQLLocalDB`, or edit `ConnectionStrings:Default` in `Scooply.Api/appsettings.json`.
- **Port already in use** → stop the other process or change the port in `Properties/launchSettings.json` and `environment.ts`.
