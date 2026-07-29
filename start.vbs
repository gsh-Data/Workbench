Set WshShell = CreateObject("WScript.Shell")
' 0 means hide window
WshShell.Run "cmd /c start.bat", 0
Set WshShell = Nothing
