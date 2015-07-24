@echo off
bomremover.exe src\playfab\ *.java
bomremover.exe src\playfab\internal\ *.java
cd src
javac -cp "..\lib\gson-2.2.4.jar" playfab\*.java playfab\internal\*.java
jar cf ../build.jar playfab\