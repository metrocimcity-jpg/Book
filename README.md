# Book

Metropolitan CIM notes. Clone this repository onto your machine and keep the other product repos beside it.

## Clone on local

Git for Windows, then:

```powershell
git clone https://github.com/metrocimcity-jpg/Book.git D:\@LIB\Book
cd D:\@LIB\Book
```

macOS / Linux:

```bash
git clone https://github.com/metrocimcity-jpg/Book.git "$HOME/@LIB/Book"
cd "$HOME/@LIB/Book"
```

## Clone script

After the first clone, use the helper to refresh Book or to pull the sibling repos into the same parent folder.

Windows (default root `D:\@LIB`):

```powershell
.\scripts\Clone-Local.ps1
.\scripts\Clone-Local.ps1 -All
.\scripts\Clone-Local.ps1 -Root C:\src -Repo MetroCIM, Web
```

macOS / Linux (default root `$HOME/@LIB`):

```bash
chmod +x scripts/clone-local.sh
./scripts/clone-local.sh
./scripts/clone-local.sh --all
./scripts/clone-local.sh --root ~/src MetroCIM Web
```

If `D:\@LIB\Book` already exists, the script runs `git pull --ff-only` instead of cloning again.

## Sibling repos (`-All`)

| Folder | Repository |
| --- | --- |
| MetroCIM | [metrocimcity-jpg/MetroCIM](https://github.com/metrocimcity-jpg/MetroCIM) |
| MetroBI | [metrocimcity-jpg/MetroBI](https://github.com/metrocimcity-jpg/MetroBI) |
| Web | [metrocimcity-jpg/Web](https://github.com/metrocimcity-jpg/Web) |
| City | [metrocimcity-jpg/City](https://github.com/metrocimcity-jpg/City) |
| PyroBIM | [metrocimcity-jpg/PyroBIM](https://github.com/metrocimcity-jpg/PyroBIM) |
| Alita | [metrocimcity-jpg/Alita](https://github.com/metrocimcity-jpg/Alita) |
| Atlas | [metrocimcity-jpg/Atlas](https://github.com/metrocimcity-jpg/Atlas) |
| CircoBIM | [metrocimcity-jpg/CircoBIM](https://github.com/metrocimcity-jpg/CircoBIM) |
| PowerBIM | [metrocimcity-jpg/PowerBIM](https://github.com/metrocimcity-jpg/PowerBIM) |
| Graph | [metrocimcity-jpg/Graph](https://github.com/metrocimcity-jpg/Graph) |
| COBieAutomation | [metrocimcity-jpg/COBieAutomation](https://github.com/metrocimcity-jpg/COBieAutomation) |
| RevitAddins | [metrocimcity-jpg/RevitAddins](https://github.com/metrocimcity-jpg/RevitAddins) |
