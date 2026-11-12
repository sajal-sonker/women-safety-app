package com.surakshaai.monitoring

import android.app.*
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.app.NotificationCompat
import com.surakshaai.MainActivity

object CheckInAlerts {
    const val CHANNEL="voice_check_in_v2"
    const val ID=4203
    fun channel(context:Context){
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(NotificationChannel(CHANNEL,"Voice check-in alerts",NotificationManager.IMPORTANCE_HIGH).apply{
            description="Help and Bachao check-ins and optional SOS countdowns";enableVibration(true);lockscreenVisibility=Notification.VISIBILITY_PRIVATE
        })
    }
    fun canInterrupt(context:Context):Boolean {
        return (context.getSystemService(NotificationManager::class.java).getNotificationChannel(CHANNEL)?.importance?:0)>=NotificationManager.IMPORTANCE_HIGH
    }
    fun notification(context:Context,session:String,seconds:Int=0):Notification {
        channel(context)
        val open=PendingIntent.getActivity(context,4203,Intent(context,MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),PendingIntent.FLAG_IMMUTABLE)
        fun action(name:String)=PendingIntent.getService(context,0,Intent(context,AudioMonitoringService::class.java).setAction(name).setData(Uri.parse("suraksha://voice/$session/$name")).putExtra("session_id",session),PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(context,CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(if(seconds>0)"SOS in $seconds seconds" else "Do you need help?")
            .setContentText(if(seconds>0)"Repeated help words heard. Cancel if you are okay." else "Help words or a sound were heard. You can request SOS now.")
            .setContentIntent(open).setCategory(NotificationCompat.CATEGORY_REMINDER).setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setOnlyAlertOnce(true).setOngoing(seconds>0).setAutoCancel(seconds==0)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel,if(seconds>0)"Cancel SOS" else "I’m okay",action("DISMISS"))
            .addAction(android.R.drawable.ic_dialog_alert,"Send SOS",action("SEND_SOS"))
            .build()
    }
}
