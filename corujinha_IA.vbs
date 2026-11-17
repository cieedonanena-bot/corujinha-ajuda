' ============================================
' Corujinha Ajuda - Inicializador silencioso
' ============================================

Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

' Pasta onde este .vbs está salvo
pastaProjeto = fso.GetParentFolderName(WScript.ScriptFullName)

' Caminho do iniciar.bat
scriptBat = pastaProjeto & "\iniciar.bat"

' Verifica se o .bat existe
If Not fso.FileExists(scriptBat) Then
    MsgBox "Arquivo iniciar.bat nao encontrado na pasta:" & vbCrLf & pastaProjeto, 16, "Corujinha Ajuda"
    WScript.Quit 1
End If

' Executa o .bat com janela oculta (0 = invisível, False = não espera terminar)
WshShell.CurrentDirectory = pastaProjeto
WshShell.Run "cmd /c """ & scriptBat & """", 0, False

' Mostra uma notificação discreta
MsgBox "Corujinha Ajuda iniciado em segundo plano!" & vbCrLf & vbCrLf & _
       "O navegador abrira em alguns segundos." & vbCrLf & _
       "Para encerrar, use o parar.bat.", 64, "Corujinha Ajuda"