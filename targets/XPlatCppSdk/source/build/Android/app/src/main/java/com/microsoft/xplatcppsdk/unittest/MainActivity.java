package com.microsoft.xplatcppsdk.unittest;

import java.util.Timer;
import java.util.TimerTask;

import android.app.Activity;
import android.os.Handler;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.widget.TextView;

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
    String restResultText = null;
    final Runnable runUnitTest = new Runnable() {
        @Override
        public void run() {
            RunUnitTest();
        }
    };

    private void setTextToTextView(String text) {
        class SetTextToTextView implements Runnable {
            protected String text = null;
            SetTextToTextView(String text) {
                this.text = text;
            }
            @Override
            public void run() {
                TextView textView = (TextView) findViewById(R.id.TextView);
                textView.setText(this.text);
            }
        }
        handler.post(new SetTextToTextView(text));
    }

    public void startTimer() {
        setTextToTextView("Preparing to test...");

        //set a new Timer
        timer = new Timer();

        //initialize the TimerTask's job
        initializeTimerTask();

        //schedule the timer, after the first 5000ms the TimerTask will run every 10000ms
        timer.schedule(timerTask, 3000); //
    }

    public void initializeTimerTask() {

        timerTask = new TimerTask() {
            public void run() {
                timer.cancel();
                setTextToTextView("Unittest started...");

                runUnitTest.run();

                timer = null;
            }
        };
    }

    public void updateText(String text)
    {
        restResultText = text;
        setTextToTextView(restResultText);
    }

    public native int RunUnitTest();

    static {
        System.loadLibrary("UnitTest");
    }
}
