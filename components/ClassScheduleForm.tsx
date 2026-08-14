'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ClassScheduleForm() {
  const [className, setClassName] = useState('');
  const [day, setDay] = useState('');
  const [room, setRoom] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log({ className, day, room });
    // TODO: send to your API / Supabase insert here
  }

  return (
    <Card className="p-6 max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-semibold">Add Class Schedule</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Class Name</label>
          <Input
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="e.g. Data Structures"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Day</label>
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger>
              <SelectValue placeholder="Select a day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monday">Monday</SelectItem>
              <SelectItem value="tuesday">Tuesday</SelectItem>
              <SelectItem value="wednesday">Wednesday</SelectItem>
              <SelectItem value="thursday">Thursday</SelectItem>
              <SelectItem value="friday">Friday</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Room</label>
          <Input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="e.g. IT-201"
            required
          />
        </div>

        <Button type="submit" className="w-full">
          Save Schedule
        </Button>
      </form>
    </Card>
  );
}
