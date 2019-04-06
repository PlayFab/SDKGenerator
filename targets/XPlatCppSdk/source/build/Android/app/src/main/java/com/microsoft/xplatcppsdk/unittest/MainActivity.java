package com.microsoft.xplatcppsdk.unittest;

import java.util.Timer;
import java.util.TimerTask;

import android.os.Handler;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        startTimer();
    }

    Timer timer;
    TimerTask timerTask;
    final Handler handler = new Handler();

    public void startTimer() {
        //set a new Timer
        timer = new Timer();

        //initialize the TimerTask's job
        initializeTimerTask();

        //schedule the timer, after the first 5000ms the TimerTask will run every 10000ms
        timer.schedule(timerTask, 5000, 10000); //
    }

    public void initializeTimerTask() {

        timerTask = new TimerTask() {
            public void run() {

                //use a handler to run a toast that shows the current timestamp
                handler.post(new Runnable() {
                    public void run() {
                        RunUnitTest();
                    }
                });

                timer.cancel();
                timer = null;
            }
        };
    }

    public native int RunUnitTest();

    static {
        System.loadLibrary("UnitTest");
    }
}
