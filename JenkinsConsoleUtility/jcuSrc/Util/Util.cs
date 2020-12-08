using System;
using System.Collections;

namespace JenkinsConsoleUtility.Util
{
    public static class JcuUtil
    {
        public static void FancyWriteToConsole(params object[] lines)
        {
            Console.ForegroundColor = ConsoleColor.White;
            _FancyWriteToConsole(lines);
            Console.ForegroundColor = ConsoleColor.White;
        }

        private static void _FancyWriteToConsole(params object[] lines)
        {
            if (lines == null)
            {
                Console.Write("\n");
                return;
            }
            foreach (var each in lines)
            {
                if (each is ConsoleColor)
                    Console.ForegroundColor = (ConsoleColor)each;
                else if (each is string)
                    Console.Write(each);
                else if (each is IEnumerable)
                    foreach (var intEach in (IEnumerable)each)
                        _FancyWriteToConsole(intEach);
                else
                    Console.Write(each);
            }
            Console.Write("\n");
        }
    }
}
