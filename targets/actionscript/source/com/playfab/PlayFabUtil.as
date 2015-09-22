package com.playfab
{
    public class PlayFabUtil
    {
        //private static const TimePattern:RegExp = new RegExp("(\d+)\-(\d+)\-(\d+)T(\d+)\:(\d+)\:(\d+)(\.(\d+))?Z?", "x");
        private static const TimePattern:RegExp = new RegExp("(\\d+)\\-(\\d+)\\-(\\d+)T(\\d+)\\:(\\d+)\\:(\\d+)(\\.(\\d+))?Z?", "x");

        public static function parseDate(data:String):Date
        {
            if(data == null || data.length == 0)
                return null;

            var result:Object = TimePattern.exec(data);

            if(result == null)
                return null;

            var year:Number = parseInt(result[1]);
            var month:Number = parseInt(result[2]);
            var day:Number = parseInt(result[3]);

            var hour:Number = parseInt(result[4]);
            var minute:Number = parseInt(result[5]);
            var second:Number = parseInt(result[6]);

            var milliseconds:Number = 0;
            if(result.length == 9)
                milliseconds = parseInt(result[8]);

            if(data.charAt(data.length-1) == "Z")
            {
                return new Date(Date.UTC(year, month-1, day, hour, minute, second, milliseconds));
            }
            else
            {
                return new Date(year, month-1, day, hour, minute, second, milliseconds);
            }
        }
    }
}