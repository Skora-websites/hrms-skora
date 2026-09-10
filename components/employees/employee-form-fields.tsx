"use client";

import * as React from "react";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { FormSection } from "@/components/ui/form-section";
import {
  User,
  Phone,
  Building,
  Briefcase,
  Shield,
  Activity,
  AtSign,
  Key,
  MapPin,
  PhoneCall,
  Calendar,
  Hash,
  Lock,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ────────────────────────────────────────────────

interface FormState {
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  status: string;
  departmentId: string;
  departmentName: string;
  designationId: string;
  designationName: string;
  joiningDate: string;
  employeeCode: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
}

interface EmployeeFormFieldsProps {
  form: FormState;
  formErrors: Record<string, string>;
  fieldTouched: Record<string, boolean>;
  departments: any[];
  designations: any[];
  updateNameField: (field: "firstName" | "lastName", value: string) => void;
  handleBlur: (field: keyof FormState) => void;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  emergencyExpanded: boolean;
  setEmergencyExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  isEdit?: boolean;
  addDialogFirstFieldRef?: React.RefObject<HTMLInputElement | null>;
  editDialogFirstFieldRef?: React.RefObject<HTMLInputElement | null>;
}

// ── Constants ────────────────────────────────────────────

const EMPLOYEE_STATUSES = [
  "active",
  "probation",
  "notice_period",
  "terminated",
  "resigned",
];

const EMPLOYEE_ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "hr", label: "HR Manager" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
];

function formatLabel(s: string) {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Component ────────────────────────────────────────────

function EmployeeFormFields({
  form,
  formErrors,
  fieldTouched,
  departments,
  designations,
  updateNameField,
  handleBlur,
  setForm,
  emergencyExpanded,
  setEmergencyExpanded,
  isEdit = false,
  addDialogFirstFieldRef,
  editDialogFirstFieldRef,
}: EmployeeFormFieldsProps) {
  return (
    <>
      {/* Section 1: Personal Information */}
      <FormSection
        title="Personal Information"
        description="Basic details about the employee"
        icon={<User className="h-4 w-4" />}
        columns={2}
      >
        <FormInput
          ref={isEdit ? editDialogFirstFieldRef : addDialogFirstFieldRef}
          label="First Name"
          icon={<User className="h-4 w-4" />}
          value={form.firstName}
          onChange={(e) => updateNameField("firstName", e.target.value)}
          onBlur={() => handleBlur("firstName")}
          placeholder="John"
          required
          error={fieldTouched.firstName ? formErrors.firstName : undefined}
        />
        <FormInput
          label="Last Name"
          icon={<User className="h-4 w-4" />}
          value={form.lastName}
          onChange={(e) => updateNameField("lastName", e.target.value)}
          onBlur={() => handleBlur("lastName")}
          placeholder="Doe"
          required
          error={fieldTouched.lastName ? formErrors.lastName : undefined}
        />
        <FormInput
          label="Display Name"
          icon={<User className="h-4 w-4" />}
          value={form.displayName}
          onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
          placeholder="Auto-filled from first & last name"
          helperText="Auto-generated from first + last name"
        />
        <FormInput
          label="Phone"
          icon={<Phone className="h-4 w-4" />}
          value={form.phone}
          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
          onBlur={() => handleBlur("phone")}
          placeholder="+1 555-1234"
          error={fieldTouched.phone ? formErrors.phone : undefined}
        />
        <FormInput
          label="Joining Date"
          type="date"
          icon={<Calendar className="h-4 w-4" />}
          value={form.joiningDate}
          onChange={(e) => setForm((prev) => ({ ...prev, joiningDate: e.target.value }))}
        />
        {/* Employee Code — only shown in edit mode as read-only */}
        {isEdit && form.employeeCode && (
          <FormInput
            label="Employee Code"
            icon={<Hash className="h-4 w-4" />}
            value={form.employeeCode}
            disabled
            helperText="Auto-generated, cannot be changed"
            endIcon={<Lock className="h-3.5 w-3.5 text-muted" />}
          />
        )}
      </FormSection>

      {/* Section 2: Department & Designation */}
      <FormSection
        title="Organization"
        description="Department, designation, and role"
        icon={<Building className="h-4 w-4" />}
        columns={2}
      >
        <FormSelect
          label="Department"
          icon={<Building className="h-4 w-4" />}
          value={form.departmentId}
          onChange={(e) => {
            const dept = (departments || []).find((d: any) => d.id === e.target.value);
            setForm((prev) => ({
              ...prev,
              departmentId: e.target.value,
              departmentName: dept?.name || "",
            }));
          }}
          options={(departments || []).map((d: any) => ({ value: d.id, label: d.name }))}
          placeholder="Select department"
        />
        <FormSelect
          label="Designation"
          icon={<Briefcase className="h-4 w-4" />}
          value={form.designationId}
          onChange={(e) => {
            const des = (designations || []).find((d: any) => d.id === e.target.value);
            setForm((prev) => ({
              ...prev,
              designationId: e.target.value,
              designationName: des?.name || "",
            }));
          }}
          options={(designations || []).map((d: any) => ({ value: d.id, label: d.name }))}
          placeholder="Select designation"
        />
        <FormSelect
          label="Role"
          icon={<Shield className="h-4 w-4" />}
          value={form.role}
          onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
          options={EMPLOYEE_ROLES}
          placeholder="Select role"
        />
        <FormSelect
          label="Status"
          icon={<Activity className="h-4 w-4" />}
          value={form.status}
          onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
          options={EMPLOYEE_STATUSES.map((s) => ({
            value: s,
            label: formatLabel(s),
          }))}
          placeholder="Select status"
        />
      </FormSection>

      {/* Section 3: Account */}
      <FormSection
        title="Account Details"
        description="Login credentials and permissions"
        icon={<Shield className="h-4 w-4" />}
        columns={2}
      >
        <FormInput
          label="Email"
          type="email"
          icon={<AtSign className="h-4 w-4" />}
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          onBlur={() => handleBlur("email")}
          placeholder="john@company.com"
          required
          error={fieldTouched.email ? formErrors.email : undefined}
        />
        {!isEdit && (
          <FormInput
            label="Password"
            type="password"
            icon={<Key className="h-4 w-4" />}
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            onBlur={() => handleBlur("password")}
            placeholder="Min. 6 characters"
            required
            error={fieldTouched.password ? formErrors.password : undefined}
            helperText="Temporary password for first login"
          />
        )}
        <FormInput
          label="Address"
          icon={<MapPin className="h-4 w-4" />}
          value={form.address}
          onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
          placeholder="123 Main St, City"
        />
      </FormSection>

      {/* Section 4: Emergency Contact (collapsible) */}
      <div className="rounded-xl border border-border bg-card overflow-hidden transition-all duration-300">
        <button
          type="button"
          onClick={() => setEmergencyExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <PhoneCall className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-dark dark:text-white">Emergency Contact</p>
              <p className="text-xs text-dark/70 dark:text-gray-400">
                {emergencyExpanded
                  ? "Click to collapse"
                  : "Optional — person to contact in emergencies"}
              </p>
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted transition-transform duration-300",
              emergencyExpanded && "rotate-180"
            )}
          />
        </button>
        <AnimatePresence>
          {emergencyExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Contact Name"
                  icon={<User className="h-4 w-4" />}
                  value={form.emergencyContact}
                  onChange={(e) => setForm((prev) => ({ ...prev, emergencyContact: e.target.value }))}
                  placeholder="Jane Doe"
                />
                <FormInput
                  label="Contact Phone"
                  icon={<Phone className="h-4 w-4" />}
                  value={form.emergencyPhone}
                  onChange={(e) => setForm((prev) => ({ ...prev, emergencyPhone: e.target.value }))}
                  placeholder="+1 555-5678"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// Memoize: only re-render when form data or validation state actually changes
export default React.memo(EmployeeFormFields) as typeof EmployeeFormFields;
