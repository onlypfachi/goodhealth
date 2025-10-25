<?php

use App\Http\Controllers\api\AuthController;
use App\Http\Controllers\api\DepartmentController;
use App\Http\Controllers\api\UserController;
use App\Http\Controllers\api\AppointmentController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/tokens/create', function (Request $request) {
    $token = $request->user()->createToken($request->token_name);

    return ['token' => $token->plainTextToken];
});

Route::post('auth/patient/signup', [AuthController::class, 'signUp']);
Route::post('auth/patient/login', [AuthController::class, 'login']);

Route::get('auth/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::apiResource('departments', DepartmentController::class)->middleware('auth:sanctum');
Route::apiResource('appointments', AppointmentController::class)->middleware('auth:sanctum');


Route::apiResource('/users', UserController::class);
