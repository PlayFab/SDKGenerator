@echo off
bomremover.exe playfab\ *.java
bomremover.exe playfab\internal\ *.java
javac -cp "gson-2.2.4.jar" playfab\*.java playfab\internal\*.java
jar cf build.jar playfab\