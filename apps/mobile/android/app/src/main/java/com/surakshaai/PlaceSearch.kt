package com.surakshaai

import android.content.Context
import android.location.Address
import android.location.Geocoder
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Promise
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

// User-initiated place-name lookup only. No GPS, history, logs or API keys.
class PlaceSearch(private val context:Context){
    private val worker=Executors.newSingleThreadExecutor()
    private val busy=AtomicBoolean(false)
    private val handler=Handler(Looper.getMainLooper())
    fun search(query:String,promise:Promise){
        val text=query.trim()
        if(text.length !in 3..160){promise.reject("SEARCH_QUERY","Enter a place name and city.");return}
        if(!Geocoder.isPresent()){promise.reject("SEARCH_UNAVAILABLE","Place search is unavailable on this phone. You can try the demo places.");return}
        if(!busy.compareAndSet(false,true)){promise.reject("SEARCH_BUSY","A search is already running. Please wait a moment.");return}
        val done=AtomicBoolean(false)
        val timeout=Runnable{if(done.compareAndSet(false,true))promise.reject("SEARCH_TIMEOUT","Search took too long. Check your connection and try again.")}
        handler.postDelayed(timeout,8000)
        fun complete(addresses:List<Address>?,error:Boolean=false){
            busy.set(false);handler.removeCallbacks(timeout)
            if(!done.compareAndSet(false,true))return
            if(error){promise.reject("SEARCH_UNAVAILABLE","Could not search places. Check your connection or try the demo places.");return}
            val rows=JSONArray()
            addresses.orEmpty().filter{it.hasLatitude()&&it.hasLongitude()&&it.latitude.isFinite()&&it.longitude.isFinite()&&it.latitude in -90.0..90.0&&it.longitude in -180.0..180.0}.take(5).forEach{a->
                val label=if(a.maxAddressLineIndex>=0)a.getAddressLine(0) else listOfNotNull(a.featureName,a.locality,a.adminArea).distinct().joinToString(", ")
                if(!label.isNullOrBlank())rows.put(JSONObject().put("label",label.take(220)).put("lat",a.latitude).put("lon",a.longitude).put("source","PHONE"))
            }
            promise.resolve(JSONObject().put("items",rows).toString())
        }
        worker.execute{try{
            val coder=Geocoder(context,Locale.getDefault())
            if(Build.VERSION.SDK_INT>=33)coder.getFromLocationName(text,5,object:Geocoder.GeocodeListener{
                override fun onGeocode(addresses:MutableList<Address>){complete(addresses)}
                override fun onError(message:String?){complete(null,true)}
            })
            else {@Suppress("DEPRECATION") val addresses=coder.getFromLocationName(text,5);complete(addresses)}
        }catch(_:Exception){complete(null,true)}}
    }
    fun close(){worker.shutdown()}
}
