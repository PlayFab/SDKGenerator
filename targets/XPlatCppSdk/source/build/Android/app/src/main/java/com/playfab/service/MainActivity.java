package com.playfab.service;

import java.util.Timer;
import java.util.TimerTask;
import java.io.InputStream;
import android.content.Context;

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
            String titleData = loadPackagedTestTitleData();
            if(titleData != null) {
                SetTitleData(titleData);
            }
            RunUnitTest();
        }
    };

    TimerTask killProcessTask = new TimerTask() {
        @Override
        public void run() {
            android.os.Process.killProcess(android.os.Process.myPid());
        }
    };

    public String loadPackagedTestTitleData() {
        String json = null;
        try {
            Context context = getApplicationContext();

            InputStream is = context.getAssets().open("testTitleData.json");

            int size = is.available();

            byte[] buffer = new byte[size];

            is.read(buffer);

            is.close();

            json = new String(buffer, "UTF-8");


        } catch (Exception ex) {
            ex.printStackTrace();
            return null;
        }
        return json;

    }

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
                timer = new Timer();
                timer.schedule(killProcessTask, 5000);
            }
        };
    }

    public void updateText(String text)
    {
        restResultText = text;
        setTextToTextView(restResultText);
    }

    public native int RunUnitTest();
    public native int SetTitleData(String value);

    static {
        System.loadLibrary("UnitTest");
    }
}
