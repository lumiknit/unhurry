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
        @Volatile
        var running: Boolean = false
        @Volatile
        var listening: Boolean = false

        @Volatile
        var updatedTimestampMS: Long = 0
        @Volatile
        var completedText: String = ""
        @Volatile
        var partialText: String = ""
        @Volatile
        var errors: List<String> = listOf()

        @Synchronized
        fun updateCompletedText(text: String) {
            completedText += text + " "
            partialText = ""
            updatedTimestampMS = System.currentTimeMillis()
        }

        @Synchronized
        fun updatePartialText(text: String) {
            partialText = text
            updatedTimestampMS = System.currentTimeMillis()
        }

        @Synchronized
        fun flushPartialText() {
            if (partialText.isNotEmpty()) {
                updateCompletedText(partialText)
            }
        }

        @Synchronized
        fun addError(error: String) {
            errors += error
        }

        @Synchronized
        fun clear() {
            running = false
            updatedTimestampMS = 0
            completedText = ""
            partialText = ""
            errors = listOf()
        }

        @Synchronized
        fun flushToJS(obj: JSObject) {
            // Put all states
            obj.put("recognizing", running)
            obj.put("timestampMs", updatedTimestampMS)
            obj.put("completedText", completedText)
            obj.put("partialText", partialText)
            val errorsArray = JSArray()
            errors.forEach {
                errorsArray.put(it)
            }
            obj.put("errors", errorsArray)

            // Clear completed
            completedText = ""
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
            var msg: String
            var recoverable = false
            // Error to string
            when (error) {
                SpeechRecognizer.ERROR_AUDIO -> msg = "Audio error"
                SpeechRecognizer.ERROR_CLIENT -> msg = "Client side error"
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> msg = "Insufficient permissions"
                SpeechRecognizer.ERROR_NETWORK -> msg = "Network error"
                SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> msg = "Network timeout"
                SpeechRecognizer.ERROR_NO_MATCH -> {
                    msg = "No match"
                    recoverable = true
                }
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> {
                    msg = "Recognizer busy"
                    recoverable = true
                }
                SpeechRecognizer.ERROR_SERVER -> msg = "Server error"
                SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> {
                    msg = "Speech timeout"
                    recoverable = true
                }
                else -> {
                    msg = "Unknown error"
                    recoverable = false
                }
            }

            State.flushPartialText()

            if (recoverable) {
                // Try to restart recognition
                Log.d("SpeechRecogPlugin", "Recoverable error: $msg")
                tryRestartRecognition()
            } else {
                // Stop recognition
                Log.d("SpeechRecogPlugin", "Unrecoverable error: $msg")
                Toast.makeText(activity, "STT Error: $msg", Toast.LENGTH_SHORT).show()
                State.addError(msg)
                stopRecognition()
            }
        }

        override fun onResults(results: Bundle?) {
            val texts = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            if (texts != null && texts.size > 0) {
                State.updateCompletedText(texts[0])
            } else {
                State.flushPartialText()
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
            //intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
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
                this.activity
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
        State.flushToJS(ret)

        invoke.resolve(ret)
    }
}
