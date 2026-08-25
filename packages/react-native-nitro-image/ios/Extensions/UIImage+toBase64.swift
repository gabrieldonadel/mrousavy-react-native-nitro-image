//
//  UIImage+toBase64.swift
//  react-native-nitro-image
//
//  Created by Marc Rousavy on 25.08.26.
//

import UIKit

extension UIImage {
  /**
   * Encodes this Image in the given `format` and returns its Base64 string.
   */
  func toBase64(format: ImageFormat, quality: Double) throws -> String {
    let data = try getData(in: format, quality: quality)
    return data.base64EncodedString()
  }
}
