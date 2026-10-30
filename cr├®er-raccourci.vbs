' Crée un raccourci "Solo Leveling" sur le Bureau, pointant vers index.html
' dans ce même dossier, avec l'icône du jeu si elle est présente.
' Double-clique sur ce fichier pour l'exécuter.

Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set WshShell = CreateObject("WScript.Shell")
desktop = WshShell.SpecialFolders("Desktop")

Set link = WshShell.CreateShortcut(desktop & "\Solo Leveling.lnk")
link.TargetPath = scriptDir & "\index.html"
link.WorkingDirectory = scriptDir

iconPath = scriptDir & "\assets\icons\icon.ico"
If fso.FileExists(iconPath) Then
    link.IconLocation = iconPath
End If

link.Save

MsgBox "Raccourci créé sur le Bureau !", 64, "Solo Leveling"
