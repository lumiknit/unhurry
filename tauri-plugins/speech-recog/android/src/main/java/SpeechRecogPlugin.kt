package lumiknit.tauri.speechrecog

import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSArray

import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer

@InvokeArg
class PingArgs {
  var value: String? = null
}

@InvokeArg
class IsSupportedArgs

@InvokeArg
class StartRecognitionArgs {
    var languages: List<String>? = null
}

@InvokeArg
class StopRecognitionArgs

@InvokeArg
class IsRecognizingArgs

@InvokeArg
class GetRecognizedResultArgs

@TauriPlugin
class SpeechRecogPlugin(private val activity: Activity): Plugin(activity) {
    var mRecognizer: SpeechRecognizer?

    object State {
        var running: Boolean = false
        var listening: Boolean = false

        var updatedTimestampMS: Long = 0
        var completedText: String = ""
        var partialText: String = ""
        var errors: List<String> = listOf()

        fun updateCompletedText(text: String) {
            if (completedText.length > 0) {
                completedText += " "
            }
            completedText += text
            partialText = ""
            updatedTimestampMS = System.currentTimeMillis()
        }

        fun updatePartialText(text: String) {
            partialText = text
            updatedTimestampMS = System.currentTimeMillis()
        }

        fun flushPartialText() {
            if (partialText.length > 0) {
                updateCompletedText(partialText)
            }
        }

        fun addError(error: String) {
            errors += error
        }

        fun clear() {
            running = false
            updatedTimestampMS = 0
            completedText = ""
            partialText = ""
            errors = listOf()
        }
    }

    init {
        mRecognizer = null
    }

    var mListener = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {
            Log.d("SpeechRecogPlugin", "onReadyForSpeech")
            // Do nothing
        }

        override fun onBeginningOfSpeech() {
            Log.d("SpeechRecogPlugin", "onBeginningOfSpeech")
            // Do nothing
        }

        override fun onRmsChanged(rmsdB: Float) {
            // Do nothing
        }

        override fun onBufferReceived(buffer: ByteArray?) {
            // Do nothing
        }

        override fun onEndOfSpeech() {
            Log.d("SpeechRecogPlugin", "onEndOfSpeech")
        }

        fun raiseError(error: String) {
            State.addError(error)
            Log.e("SpeechRecogPlugin", error)
            Toast.makeText(activity, "STT Error: $error", Toast.LENGTH_SHORT).show()
        }

        override fun onError(error: Int) {
            // Error to string
            when (error) {
                SpeechRecognizer.ERROR_AUDIO -> raiseError("Audio recording error")
                SpeechRecognizer.ERROR_CLIENT -> raiseError("Client side error")
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> raiseError("Insufficient permissions")
                SpeechRecognizer.ERROR_NETWORK -> raiseError("Network error")
                SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> raiseError("Network timeout")
                SpeechRecognizer.ERROR_NO_MATCH -> {
                    Log.d("SpeechRecogPlugin", "No match")
                    tryRestartRecognition()
                }
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> {
                    Log.d("SpeechRecogPlugin", "Recognizer busy")
                    tryRestartRecognition()
                }
                SpeechRecognizer.ERROR_SERVER -> raiseError("Server error")
                SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> {
                    Log.d("SpeechRecogPlugin", "Speech timeout")
                    tryRestartRecognition()
                }
                else -> raiseError("Unknown error")
            }
        }

        override fun onResults(results: Bundle?) {
            val texts = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            if (texts != null && texts.size > 0) {
                State.updateCompletedText(texts[0])
            }
            Log.d("SpeechRecogPlugin", "onResults: ${State.completedText} / ${State.partialText} / ${State.errors}")

            tryRestartRecognition()
        }

        override fun onPartialResults(partialResults: Bundle?) {
            // Update the last recognized text
            val texts = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            if (texts != null && texts.size > 0) {
                State.updatePartialText(texts[0])
            }
            Log.d("SpeechRecogPlugin", "onPartialResults: ${State.completedText} / ${State.partialText} / ${State.errors}")
        }

        override fun onEvent(eventType: Int, params: Bundle?) {
            Log.d("SpeechRecogPlugin", "onEvent: $eventType")
            // Do nothing
        }
    }

    fun checkRecordingPermission(): Boolean {
        if (ContextCompat.checkSelfPermission(activity, android.Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            if (ActivityCompat.shouldShowRequestPermissionRationale(activity, android.Manifest.permission.RECORD_AUDIO)) {
                // Show an explanation to the user asynchronously
                Toast.makeText(activity, "Microphone permission is required for speech recognition.", Toast.LENGTH_LONG).show()
            } else {
                // Request the permission
                ActivityCompat.requestPermissions(activity, arrayOf(android.Manifest.permission.RECORD_AUDIO), 1)
            }
            return false
        } else {
            return true
        }
    }

    fun createRecognizerIntent(): Intent {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)

        if (Build.VERSION.SDK_INT >= 34) {
            intent.putExtra(
                RecognizerIntent.EXTRA_MASK_OFFENSIVE_WORDS,
                false
            )
            intent.putExtra(
                RecognizerIntent.EXTRA_ENABLE_LANGUAGE_DETECTION,
                true
            )
            intent.putExtra(
                RecognizerIntent.EXTRA_ENABLE_LANGUAGE_SWITCH,
                RecognizerIntent.LANGUAGE_SWITCH_BALANCED
            )
        }
        intent.putExtra(
            RecognizerIntent.EXTRA_PARTIAL_RESULTS,
            true
        )
        intent.putExtra(
            RecognizerIntent.EXTRA_CALLING_PACKAGE,
            this.activity.packageName
        )
        /*intent.putExtra(
            RecognizerIntent.EXTRA_LANGUAGE,
            languages[0]
        )*/
        intent.putExtra(
            RecognizerIntent.EXTRA_LANGUAGE_MODEL,
            RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
        }
        return intent
    }

    fun tryRestartRecognition() {
        State.flushPartialText()
        if (State.running) {
            State.listening = false
            startRecognition()
        }
    }

    fun startRecognition() {
        State.running = true

        // If no recognizer, create one
        if (mRecognizer == null) {
            mRecognizer = SpeechRecognizer.createSpeechRecognizer(
                this.activity,
                ComponentName(
                    "com.google.android.tts",
                    "com.google.android.apps.speech.tts.googletts.service.GoogleTTSRecognitionService"
                )
            )
            mRecognizer?.setRecognitionListener(mListener)
        }

        Log.d("SpeechRecogPlugin", "Starting recognition")
        if (!State.listening) {
            State.listening = true
            mRecognizer?.startListening(createRecognizerIntent())
        }
    }

    fun stopRecognition() {
        if (!State.running) {
            return
        }

        State.clear()

        if (mRecognizer != null) {
            State.listening = false
            mRecognizer?.destroy()
            mRecognizer = null
        }
    }

    @Command
    fun ping(invoke: Invoke) {
        val args = invoke.parseArgs(PingArgs::class.java)

        val ret = JSObject()
        ret.put("value", "Pong: ${args.value}")
        invoke.resolve(ret)
    }

    @Command
    fun isSupported(invoke: Invoke) {
        val ret = JSObject()
        ret.put("supported", true)
        invoke.resolve(ret)
    }

    @Command
    fun startRecognition(invoke: Invoke) {
        val ret = JSObject()

        if (!checkRecordingPermission()) {
            ret.put("success", false)
            ret.put("error", "Recording permission not granted")
            ret.put("retryAfter", true)
            invoke.resolve(ret)
            return
        }

        startRecognition()

        // Show toast
        Toast.makeText(
            this.activity,
            "Speech started",
            Toast.LENGTH_SHORT
        ).show()

        ret.put("success", true)
        invoke.resolve(ret)
    }

    @Command
    fun stopRecognition(invoke: Invoke) {
        stopRecognition()

        // Show toast
        Toast.makeText(
            this.activity,
            "Speech stopped",
            Toast.LENGTH_SHORT
        ).show()

        val ret = JSObject()
        ret.put("success", true)
        invoke.resolve(ret)
    }

    @Command
    fun getState(invoke: Invoke) {
        val ret = JSObject()
        ret.put("recognizing", State.running)
        ret.put("timestampMs", State.updatedTimestampMS)
        ret.put("completedText", State.completedText)
        ret.put("partialText", State.partialText)
        val errors = JSArray()
        State.errors.forEach {
            errors.put(it)
        }
        ret.put("errors", errors)

        invoke.resolve(ret)

        State.errors = listOf()
    }
}
