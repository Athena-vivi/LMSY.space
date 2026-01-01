'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Database, Shield, Palette, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminSettingsPage() {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    alert('Settings saved successfully!');
  };

  const settings = [
    {
      category: 'General',
      icon: Globe,
      items: [
        { label: 'Site Name', type: 'text', defaultValue: 'LMSY Official Fan Site' },
        { label: 'Site Description', type: 'textarea', defaultValue: 'Official fan website for Thai GL duo LMSY' },
        { label: 'Contact Email', type: 'email', defaultValue: 'contact@lmsy.com' },
      ],
    },
    {
      category: 'Storage',
      icon: Database,
      items: [
        { label: 'Supabase URL', type: 'text', defaultValue: 'https://vbhsoarhnwoqwprmhqie.supabase.co' },
        { label: 'Storage Bucket', type: 'text', defaultValue: 'images' },
        { label: 'Max File Size (MB)', type: 'number', defaultValue: '10' },
      ],
    },
    {
      category: 'Security',
      icon: Shield,
      items: [
        { label: 'Admin Password', type: 'password', defaultValue: '••••••••' },
        { label: 'Enable IP Whitelist', type: 'checkbox', defaultValue: false },
        { label: 'Session Timeout (minutes)', type: 'number', defaultValue: '60' },
      ],
    },
    {
      category: 'Appearance',
      icon: Palette,
      items: [
        { label: 'Primary Color', type: 'color', defaultValue: '#FBBF24' },
        { label: 'Secondary Color', type: 'color', defaultValue: '#38BDF8' },
        { label: 'Dark Mode Default', type: 'checkbox', defaultValue: false },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8">
        <h1 className="font-serif text-4xl font-bold text-foreground mb-2">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Configure your admin panel and site preferences
        </p>
      </div>

      <div className="max-w-4xl space-y-8">
        {settings.map((section, sectionIndex) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIndex * 0.1 }}
              className="border-2 border-border rounded-lg p-6"
            >
              <h2 className="font-serif text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <Icon className="h-6 w-6 text-lmsy-yellow" />
                {section.category}
              </h2>

              <div className="space-y-4">
                {section.items.map((item, itemIndex) => (
                  <div key={item.label} className="space-y-2">
                    <label className="font-medium text-foreground">{item.label}</label>

                    {item.type === 'textarea' ? (
                      <textarea
                        defaultValue={item.defaultValue as string}
                        rows={3}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-lmsy-yellow"
                      />
                    ) : item.type === 'checkbox' ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked={item.defaultValue as boolean}
                          className="w-5 h-5 rounded border-border text-lmsy-yellow focus:ring-lmsy-yellow"
                        />
                        <span className="text-sm text-muted-foreground">
                          {item.defaultValue ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    ) : item.type === 'color' ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          defaultValue={item.defaultValue as string}
                          className="w-16 h-10 rounded cursor-pointer border-0"
                        />
                        <span className="text-sm text-muted-foreground font-mono">
                          {item.defaultValue}
                        </span>
                      </div>
                    ) : (
                      <input
                        type={item.type}
                        defaultValue={item.defaultValue as string}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-lmsy-yellow"
                      />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-foreground px-8"
        >
          {saving ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save All Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
