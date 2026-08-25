package com.margelo.nitro.image.extensions

import android.graphics.Bitmap
import com.margelo.nitro.image.ImageFormat
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

@OptIn(ExperimentalEncodingApi::class)
internal fun Bitmap.toBase64(format: ImageFormat, quality: Int): String {
    val buffer = compressInMemory(format, quality)
    val startIndex = buffer.arrayOffset() + buffer.position()
    val endIndex = buffer.arrayOffset() + buffer.limit()
    return Base64.Default.encode(buffer.array(), startIndex, endIndex)
}
