<?php

namespace App\Http\Controllers\api;

use App\Data\UserData;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return UserData::collect(User::all());
    }

    /**
     * Store a newly created resource in storage.
     * */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'phone_number' => 'nullable|string|max:20',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'type'=> 'required|in:PATIENT,DOCTOR,CLINIC_MANAGER'
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone_number' => $request->phone_number,
            'password' => Hash::make($request->password),
            'type' => $request->type,
        ]);

        return response()->json(['success' => true, 'data' => $user], 201);
    }


    /**
     * Display the specified resource.
     */
    public function show(User $user)
    {
        return response()->json(['success'=> true,'user'=> UserData::from($user)],200);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $user)
{
        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|lowercase|email|max:255|unique:'.User::class.',email,'.$user->id,
            'password' => ['sometimes','required','confirmed', Rules\Password::defaults()],
            'phone_number' => 'sometimes|nullable|string|max:20',
        ]);

        $user->update([
            'name' => $request->name ?? $user->name,
            'email' => $request->email ?? $user->email,
            'phone_number' => $request->phone_number ?? $user->phone_number,
            'password' => $request->password ? Hash::make($request->password) : $user->password,
        ]);

        dd($user);

        return response()->json(['success'=> true,'user'=> UserData::from($request->user)],200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user)
    {
        //
    }
}
