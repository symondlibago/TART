<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Throwable;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Employee::query();

            if ($search = $request->query('search')) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ilike', "%{$search}%")
                        ->orWhere('employee_code', 'ilike', "%{$search}%")
                        ->orWhere('position', 'ilike', "%{$search}%");
                });
            }

            if ($request->query('active') === '1') {
                $query->where('is_active', true);
            }

            return response()->json([
                'success' => true,
                'data' => $query->orderBy('name')->get(),
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch employees',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), $this->rules());

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            $employee = Employee::create($validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Employee added',
                'data' => $employee,
            ], 201);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to add employee',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $employee = Employee::find($id);

        if (! $employee) {
            return response()->json(['success' => false, 'message' => 'Employee not found'], 404);
        }

        $validator = Validator::make($request->all(), $this->rules($id));

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            $employee->update($validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Employee updated',
                'data' => $employee->fresh(),
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update employee',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function destroy($id)
    {
        $employee = Employee::find($id);

        if (! $employee) {
            return response()->json(['success' => false, 'message' => 'Employee not found'], 404);
        }

        try {
            // Attendance rows cascade, so this also removes their history.
            $employee->delete();

            return response()->json(['success' => true, 'message' => 'Employee deleted']);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete employee',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function rules($ignoreId = null): array
    {
        $unique = 'unique:employees,employee_code' . ($ignoreId ? ",{$ignoreId}" : '');

        return [
            'employee_code' => "required|string|max:50|{$unique}",
            'name' => 'required|string|max:255',
            'position' => 'nullable|string|max:255',
            'is_active' => 'sometimes|boolean',
        ];
    }
}
