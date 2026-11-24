import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

// android/local.properties me:
//   tmh.functionsUrl=https://<ref>.supabase.co/functions/v1
//   tmh.anonKey=<supabase anon key>
val local = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

android {
    namespace = "in.receipto.trackmyhalf"
    compileSdk = 35

    defaultConfig {
        applicationId = "in.receipto.trackmyhalf"
        minSdk = 28
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
        buildConfigField("String", "FUNCTIONS_URL", "\"${local.getProperty("tmh.functionsUrl", "")}\"")
        buildConfigField("String", "ANON_KEY", "\"${local.getProperty("tmh.anonKey", "")}\"")
    }
    buildFeatures { buildConfig = true }
    buildTypes {
        release { isMinifyEnabled = false }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-messaging")
    implementation("com.google.firebase:firebase-database")
    implementation("com.google.firebase:firebase-auth")
    implementation("com.google.android.gms:play-services-location:21.3.0")
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.biometric:biometric:1.1.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.9.0")
}
