Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d ""C:\Projects\rcg-command-center"" && npm run dev -- -p 3001", 0, False
WScript.Sleep 4000
WshShell.Run "http://localhost:3001"
