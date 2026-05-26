Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d ""C:\Users\jridg\OneDrive\Desktop\Claude\rcg-command-center"" && npm run dev", 0, False
WScript.Sleep 4000
WshShell.Run "https://localhost:3000"
