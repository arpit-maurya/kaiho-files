package org.kaihofiles.app.pairing

import android.app.Activity
import android.os.Bundle
import android.widget.TextView

class QrScanActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val view = TextView(this).apply {
            text = "Kaiho Files QR scanner\nCameraX and ML Kit are declared for the production scanner flow."
            textSize = 18f
            setPadding(32, 32, 32, 32)
        }
        setContentView(view)
    }
}

